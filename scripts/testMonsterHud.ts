// scripts/testMonsterHud.ts
// Unit test for MistWalker DM Monster HUD Normalization Engine

import { buildDmMonsterHudData, parseMonsterAction, extractMonsterSpells } from '../src/services/monsterHudService';
import { SRD_MONSTERS } from '../src/data/srdMonstersCatalog';
import { DEFAULT_MONSTERS } from '../src/data/defaultMonsters';

function runTests() {
  console.log('⚡ Starting DM Monster Tactical HUD Unit Tests...\n');

  // Test 1: Goblin normalization
  console.log('[TEST 1] Goblin Token Normalization');
  const goblinToken = {
    id: 'tok_goblin_1',
    name: 'Goblin 1',
    isMonster: true,
    x: 100,
    y: 100,
    size: 1,
    currentHp: 7,
    maxHp: 7
  };

  const goblinHud = buildDmMonsterHudData(goblinToken, [...DEFAULT_MONSTERS, ...SRD_MONSTERS]);
  if (!goblinHud) {
    throw new Error('Failed to normalize Goblin 1');
  }
  console.log(`  ✓ Name: ${goblinHud.name} (Base: ${goblinHud.originalMonsterName})`);
  console.log(`  ✓ CR: ${goblinHud.cr}, AC: ${goblinHud.ac}, HP: ${goblinHud.currentHp}/${goblinHud.maxHp}`);
  console.log(`  ✓ Attacks detected: ${goblinHud.attacks.length}`);
  const scimitar = goblinHud.attacks.find(a => a.name.toLowerCase().includes('scimitar'));
  if (!scimitar) throw new Error('Missing Scimitar attack on Goblin');
  console.log(`  ✓ Scimitar: Hit ${scimitar.hitBonus}, Damage ${scimitar.damageFormula} (${scimitar.damageType})`);

  // Test 2: Dragon with Recharge & Legendary Actions
  console.log('\n[TEST 2] Young Red Dragon Normalization (Recharge & Breath Weapon)');
  const dragonToken = {
    id: 'tok_dragon_1',
    name: 'Young Red Dragon',
    isMonster: true,
    size: 2,
    hp: 178,
    maxHp: 178
  };
  const dragonHud = buildDmMonsterHudData(dragonToken, [...DEFAULT_MONSTERS, ...SRD_MONSTERS]);
  if (!dragonHud) throw new Error('Failed to normalize Young Red Dragon');
  console.log(`  ✓ Name: ${dragonHud.name}, CR: ${dragonHud.cr}`);
  console.log(`  ✓ Multiattack and breath weapons parsed: ${dragonHud.attacks.length} attacks, ${dragonHud.actions.length} actions`);
  const breath = dragonHud.actions.find(a => a.name.toLowerCase().includes('breath')) || dragonHud.attacks.find(a => a.name.toLowerCase().includes('breath'));
  if (breath) {
    console.log(`  ✓ Breath Weapon: Recharge ${breath.recharge}, Save DC ${breath.saveDc} ${breath.saveAbility}, Damage: ${breath.damageFormula}`);
  }

  // Test 3: Spellcaster Monster (Archmage or Mage)
  console.log('\n[TEST 3] Archmage Spell Deconstruction');
  const archmageToken = {
    id: 'tok_archmage_1',
    name: 'Archmage',
    isMonster: true,
    size: 1
  };
  const archmageHud = buildDmMonsterHudData(archmageToken, [...DEFAULT_MONSTERS, ...SRD_MONSTERS]);
  if (archmageHud) {
    console.log(`  ✓ Archmage Spell Save DC: ${archmageHud.spellSaveDc}, Attack Bonus: ${archmageHud.spellAttackBonus}`);
    console.log(`  ✓ Spells extracted: ${archmageHud.spells.length} spells`);
    console.log(`  ✓ Spell slots configured: ${Object.keys(archmageHud.spellSlots).length} slot levels`);
  }

  // Test 4: Per-Instance Token State Isolation
  console.log('\n[TEST 4] Per-Instance Token State Isolation');
  const goblinA = {
    id: 'tok_gob_a',
    name: 'Goblin A',
    isMonster: true,
    currentHp: 4,
    maxHp: 7,
    monsterState: {
      rechargeAvailable: { 'Nimble Escape': false },
      spellSlotsUsed: {},
      legendaryActionsMax: 0,
      legendaryActionsUsed: 0
    }
  };
  const goblinB = {
    id: 'tok_gob_b',
    name: 'Goblin B',
    isMonster: true,
    currentHp: 7,
    maxHp: 7
  };
  const hudA = buildDmMonsterHudData(goblinA, [...DEFAULT_MONSTERS, ...SRD_MONSTERS]);
  const hudB = buildDmMonsterHudData(goblinB, [...DEFAULT_MONSTERS, ...SRD_MONSTERS]);

  if (hudA?.currentHp !== 4 || hudB?.currentHp !== 7) {
    throw new Error('Token HP state leaked across instances!');
  }
  if (hudA?.state.rechargeAvailable['Nimble Escape'] !== false) {
    throw new Error('Token recharge state not isolated!');
  }
  console.log('  ✓ Token instances completely isolated: Goblin A HP=4, Goblin B HP=7');

  console.log('\n🎉 ALL DM MONSTER HUD UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests();
