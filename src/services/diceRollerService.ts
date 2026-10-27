import { DiceRoller, DiceRoll } from '@dice-roller/rpg-dice-roller';
import { EvaluatedDiceRoll } from '../types/hud';
import { DieResult } from '../types/dice';

// Singleton instance of the RPG Dice Roller
const roller = new DiceRoller();

export interface AdvancedRollResult {
  total: number;
  notation: string;
  output: string;
  renderedExpression: string;
  rolls: number[];
  dice: DieResult[];
  isCritical: boolean;
  isFumble: boolean;
  min: number;
  max: number;
  average: number;
}

/**
 * Validates whether a string is a parsable D&D / RPG dice notation
 * (e.g. "1d20", "4d6kh3", "2d8 + 5", "1d10!", "1d20ro<2", "2d20kh1 + 7")
 */
export function isValidDiceNotation(notation: string): boolean {
  if (!notation || typeof notation !== 'string') return false;
  const clean = notation.trim();
  if (clean.length === 0) return false;
  try {
    const testRoll = new DiceRoll(clean);
    return typeof testRoll.total === 'number' && !isNaN(testRoll.total);
  } catch {
    return false;
  }
}

/**
 * Sanitizes and cleans a dice formula input, removing descriptive tags or labels
 */
export function sanitizeDiceFormula(input: string): string {
  if (!input) return '1d20';
  return String(input)
    .split(/→|=/)[0]
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+(?:st|nd|rd|th)\b/gi, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/damage|healing|slashing|piercing|bludgeoning|fire|cold|lightning|radiant|necrotic|poison|acid|force|psychic|thunder/gi, ' ')
    .trim() || '1d20';
}

/**
 * Rolls an advanced D&D dice formula using @dice-roller/rpg-dice-roller.
 * Handles drop lowest (4d6kh3), exploding dice (1d10!), rerolls (1d20ro<2),
 * advantage/disadvantage (2d20kh1 / 2d20kl1), and arithmetic.
 */
export function rollAdvancedDice(notation: string): AdvancedRollResult {
  const cleanNotation = sanitizeDiceFormula(notation);
  let roll: DiceRoll;

  try {
    roll = roller.roll(cleanNotation) as DiceRoll;
  } catch (err) {
    // Fallback: try basic term parsing or default to 1d20
    try {
      const basicClean = cleanNotation.replace(/[^0-9dD+\-*\/()\s]/g, '').trim();
      roll = roller.roll(basicClean || '1d20') as DiceRoll;
    } catch {
      roll = roller.roll('1d20') as DiceRoll;
    }
  }

  const diceResults: DieResult[] = [];
  const flatRolls: number[] = [];

  // Extract individual dice rolls from the rolls tree
  try {
    const rollsData = (roll as any).rolls || [];
    const traverseRolls = (node: any) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(traverseRolls);
      } else if (node.rolls && Array.isArray(node.rolls)) {
        const sides = node.die?.sides || 20;
        node.rolls.forEach((r: any) => {
          const val = typeof r.value === 'number' ? r.value : (typeof r === 'number' ? r : 0);
          if (val > 0) {
            flatRolls.push(val);
            diceResults.push({
              sides,
              result: val,
              type: `d${sides}`
            });
          }
        });
      } else if (typeof node.value === 'number') {
        flatRolls.push(node.value);
      }
    };
    traverseRolls(rollsData);
  } catch {
    // If AST traversal fails, provide fallback
    if (flatRolls.length === 0) {
      flatRolls.push(roll.total);
      diceResults.push({ sides: 20, result: Math.min(20, Math.max(1, roll.total)), type: 'd20' });
    }
  }

  // Detect critical hit or fumble on d20 rolls
  const d20Rolls = diceResults.filter(d => d.sides === 20);
  const isCritical = d20Rolls.some(d => d.result === 20);
  const isFumble = d20Rolls.some(d => d.result === 1);

  return {
    total: roll.total,
    notation: roll.notation,
    output: roll.output,
    renderedExpression: roll.toString(),
    rolls: flatRolls,
    dice: diceResults,
    isCritical,
    isFumble,
    min: (roll as any).min || 1,
    max: (roll as any).max || roll.total,
    average: (roll as any).average || roll.total
  };
}

/**
 * Doubles all dice counts in a formula for Critical Hits
 * e.g. "2d6 + 3" -> "4d6 + 3", "1d8 + 1d6 + 4" -> "2d8 + 2d6 + 4"
 */
export function doubleDiceFormulaForCrit(formula: string): string {
  if (!formula) return formula;
  return formula.replace(/(^|[^a-zA-Z0-9])(\d*)d(\d+)/gi, (_, prefix, countStr, sides) => {
    const count = countStr ? parseInt(countStr, 10) : 1;
    return `${prefix}${count * 2}d${sides}`;
  });
}

/**
 * Rolls with D&D 5e Advantage (2d20kh1 + modifier)
 */
export function rollAdvantage(modifier = 0): AdvancedRollResult {
  const modStr = modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : '';
  return rollAdvancedDice(`2d20kh1${modStr}`);
}

/**
 * Rolls with D&D 5e Disadvantage (2d20kl1 + modifier)
 */
export function rollDisadvantage(modifier = 0): AdvancedRollResult {
  const modStr = modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : '';
  return rollAdvancedDice(`2d20kl1${modStr}`);
}

/**
 * Standard D&D 5e Ability Score Roll: 4d6 drop lowest (4d6kh3)
 */
export function rollAbilityScore(): AdvancedRollResult {
  return rollAdvancedDice('4d6kh3');
}

/**
 * Bridge function to adapt RPG Dice Roller results into MistWalker's EvaluatedDiceRoll
 */
export function evaluateWithDiceRoller(formula: string | undefined, isCrit = false): EvaluatedDiceRoll {
  if (!formula || !String(formula).trim()) {
    const res = rollAdvancedDice('1d8');
    return {
      total: res.total,
      dice: res.dice,
      rolls: res.rolls,
      sides: 8,
      bonus: 0,
      diceSum: res.total,
      breakdown: res.output
    };
  }

  let finalFormula = sanitizeDiceFormula(formula);
  if (isCrit) {
    finalFormula = doubleDiceFormulaForCrit(finalFormula);
  }

  // Handle flat integer formulas
  if (/^\d+$/.test(finalFormula)) {
    const val = parseInt(finalFormula, 10);
    return {
      total: val,
      dice: [],
      rolls: [val],
      sides: 8,
      bonus: val,
      diceSum: 0,
      breakdown: `${val} (Flat)`
    };
  }

  const res = rollAdvancedDice(finalFormula);
  const primarySides = res.dice[0]?.sides || 6;
  const diceSum = res.dice.reduce((acc, d) => acc + d.result, 0);
  const bonus = res.total - diceSum;

  return {
    total: res.total,
    dice: res.dice,
    rolls: res.rolls,
    sides: primarySides,
    bonus,
    diceSum,
    breakdown: res.output
  };
}
