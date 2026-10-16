/**
 * Monster Size definitions for map space occupation.
 * 
 * Logic mapping:
 * • Tiny: Occupies a 2.5 by 2.5-foot space (up to four can fit in a single 5-foot grid square). Examples include imps and sprites.
 * • Small: Occupies a 5 by 5-foot space (one grid square). Examples include goblins and giant rats.
 * • Medium: Occupies a 5 by 5-foot space (one grid square). Examples include orcs and werewolves.
 * • Large: Occupies a 10 by 10-foot space (four grid squares). Examples include ogres and hippogriffs.
 * • Huge: Occupies a 15 by 15-foot space (nine grid squares). Examples include treants and fire giants.
 * • Gargantuan: Occupies a 20 by 20-foot or larger space (16 or more grid squares). Examples include krakens and purple worms.
 */
export const MONSTER_SIZE_LOGIC = {
  Tiny: { space: 0.5, gridSquares: 0.25, examples: ['imps', 'sprites'] },
  Small: { space: 5, gridSquares: 1, examples: ['goblins', 'giant rats'] },
  Medium: { space: 5, gridSquares: 1, examples: ['orcs', 'werewolves'] },
  Large: { space: 10, gridSquares: 4, examples: ['ogres', 'hippogriffs'] },
  Huge: { space: 15, gridSquares: 9, examples: ['treants', 'fire giants'] },
  Gargantuan: { space: 20, gridSquares: 16, examples: ['krakens', 'purple worms'] },
};
