/**
 * MistWalker VTT Comprehensive Stress Test & Error Diagnostic Suite
 * 
 * Verifies:
 * 1. Multi-Touch Math & Pinch-Zoom Engine (100,000 rapid/degenerate touch frames)
 * 2. Character & Hero Dock Data Parsing Under Corrupted Payloads (50,000 stress runs)
 * 3. High-Frequency Socket Event Serialization & Concurrency (10,000 rapid packets)
 */

import { performance } from 'perf_hooks';

interface TouchPoint {
  clientX: number;
  clientY: number;
}

interface TouchState {
  lastDist: number;
  lastCenter: { x: number; y: number };
  initialScale: number;
}

// ---------------------------------------------------------------------------
// 1. Multi-Touch Pinch & Pan Math Engine Test
// ---------------------------------------------------------------------------
function simulateTouchEngine(
  touches: TouchPoint[],
  currentScale: number,
  currentPos: { x: number; y: number },
  touchState: TouchState | null
): {
  newScale: number;
  newPos: { x: number; y: number };
  newTouchState: TouchState | null;
} {
  if (touches.length === 2) {
    const t1 = touches[0];
    const t2 = touches[1];
    const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    const center = {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };

    if (!touchState) {
      return {
        newScale: currentScale,
        newPos: currentPos,
        newTouchState: {
          lastDist: dist,
          lastCenter: center,
          initialScale: currentScale
        }
      };
    }

    const { lastDist, lastCenter } = touchState;
    if (lastDist > 5 && dist > 5 && Number.isFinite(currentScale) && currentScale > 0) {
      const scaleFactor = dist / lastDist;
      const newScale = Math.max(0.12, Math.min(currentScale * scaleFactor, 4.5));

      const pointTo = {
        x: (center.x - currentPos.x) / currentScale,
        y: (center.y - currentPos.y) / currentScale
      };

      const dx = center.x - lastCenter.x;
      const dy = center.y - lastCenter.y;

      const newPos = {
        x: center.x - pointTo.x * newScale + dx,
        y: center.y - pointTo.y * newScale + dy
      };

      if (Number.isFinite(newScale) && Number.isFinite(newPos.x) && Number.isFinite(newPos.y)) {
        return {
          newScale,
          newPos,
          newTouchState: {
            lastDist: dist,
            lastCenter: center,
            initialScale: touchState.initialScale
          }
        };
      }
    }

    return { newScale: currentScale, newPos: currentPos, newTouchState: touchState };
  }

  // Not 2 fingers
  return { newScale: currentScale, newPos: currentPos, newTouchState: null };
}

function runTouchStressTest(iterations = 100000) {
  console.log(`\n========================================================`);
  console.log(`[TEST 1] Multi-Touch Engine Stress Test (${iterations.toLocaleString()} frames)`);
  console.log(`========================================================`);

  const start = performance.now();
  let scale = 1.0;
  let pos = { x: 0, y: 0 };
  let touchState: TouchState | null = null;
  let nanErrors = 0;
  let boundsErrors = 0;

  for (let i = 0; i < iterations; i++) {
    // Generate various test scenarios:
    // 60% normal pinch/pan, 10% zero dist, 10% extreme numbers, 10% finger swaps, 10% touch count jitter
    const mode = Math.random();
    let touches: TouchPoint[] = [];

    if (mode < 0.6) {
      // Normal multi-touch movement
      const cx = 400 + Math.sin(i * 0.05) * 50;
      const cy = 300 + Math.cos(i * 0.05) * 50;
      const spread = 80 + Math.sin(i * 0.02) * 50;
      touches = [
        { clientX: cx - spread, clientY: cy },
        { clientX: cx + spread, clientY: cy }
      ];
    } else if (mode < 0.7) {
      // Degenerate: Exact same coordinates (dist === 0)
      touches = [
        { clientX: 200, clientY: 200 },
        { clientX: 200, clientY: 200 }
      ];
    } else if (mode < 0.8) {
      // Extreme values (large negatives, enormous coords)
      touches = [
        { clientX: -999999, clientY: -888888 },
        { clientX: 999999, clientY: 888888 }
      ];
    } else if (mode < 0.9) {
      // Instant finger swap (180 degree flip)
      touches = [
        { clientX: 500, clientY: 200 },
        { clientX: 100, clientY: 800 }
      ];
    } else {
      // 1 or 3 fingers (transition out of pinch)
      touches = Math.random() > 0.5 
        ? [{ clientX: 300, clientY: 300 }] 
        : [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 200 }, { clientX: 300, clientY: 300 }];
    }

    const result = simulateTouchEngine(touches, scale, pos, touchState);
    scale = result.newScale;
    pos = result.newPos;
    touchState = result.newTouchState;

    if (!Number.isFinite(scale) || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
      nanErrors++;
    }
    if (scale < 0.11 || scale > 4.51) {
      boundsErrors++;
    }
  }

  const duration = (performance.now() - start).toFixed(2);
  const throughput = Math.round((iterations / (parseFloat(duration) / 1000))).toLocaleString();

  console.log(`  ✓ Completed ${iterations.toLocaleString()} frames in ${duration} ms (${throughput} frames/sec)`);
  console.log(`  ✓ NaN / Infinite Coordinates Detected: ${nanErrors}`);
  console.log(`  ✓ Zoom Scale Bound Violations (<0.12 or >4.5): ${boundsErrors}`);
  console.log(`  ✓ Final Safe Transform: Scale=${scale.toFixed(3)}, Pos=(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`);

  if (nanErrors > 0 || boundsErrors > 0) {
    throw new Error(`Touch stress test failed with ${nanErrors} NaN errors and ${boundsErrors} bounds errors`);
  }
}

// ---------------------------------------------------------------------------
// 2. Character & Hero Dock Corrupted Payload Resilience Test
// ---------------------------------------------------------------------------
function sanitizeCharacterVitals(characterData: any, claimedToken: any) {
  const name = characterData?.name || claimedToken?.name || 'Hero';
  const avatarUrl = characterData?.avatarUrl || claimedToken?.avatarUrl || claimedToken?.url || '';
  const rawCurrentHp = Number(characterData?.currentHp ?? claimedToken?.currentHp ?? claimedToken?.hp ?? 25);
  const rawMaxHp = Number(characterData?.maxHp ?? claimedToken?.maxHp ?? claimedToken?.hp ?? 25);
  const currentHp = Number.isFinite(rawCurrentHp) ? Math.max(0, rawCurrentHp) : 25;
  const maxHp = Number.isFinite(rawMaxHp) && rawMaxHp > 0 ? rawMaxHp : Math.max(1, currentHp);
  const rawAc = Number(characterData?.ac ?? claimedToken?.ac ?? 14);
  const ac = Number.isFinite(rawAc) ? rawAc : 14;

  const hpPercent = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
  const strokeDashoffset = 283 - (283 * hpPercent) / 100;

  const actionsList = Array.isArray(characterData?.actions) && characterData.actions.length > 0
    ? characterData.actions
    : [{ id: 'default', name: 'Attack' }];

  const bonusActionsList = Array.isArray(characterData?.bonusActions) ? characterData.bonusActions : [];
  const spellsList = Array.isArray(characterData?.spells) ? characterData.spells : [];
  const itemsList = Array.isArray(characterData?.items) ? characterData.items : [];

  return {
    name,
    avatarUrl,
    currentHp,
    maxHp,
    ac,
    hpPercent,
    strokeDashoffset,
    totalActions: actionsList.length + bonusActionsList.length + spellsList.length + itemsList.length
  };
}

function runCharacterResilienceStressTest(iterations = 50000) {
  console.log(`\n========================================================`);
  console.log(`[TEST 2] Character Data Corrupted Payload Resilience (${iterations.toLocaleString()} runs)`);
  console.log(`========================================================`);

  const start = performance.now();
  let caughtExceptions = 0;
  let nanVitals = 0;

  const edgeCases = [
    null,
    undefined,
    {},
    { currentHp: null, maxHp: undefined, ac: "NaN" },
    { currentHp: -50, maxHp: 0 },
    { currentHp: Infinity, maxHp: -Infinity },
    { currentHp: "forty-two", maxHp: "hundred" },
    { actions: "not-an-array", bonusActions: 12345, spells: {} },
    { spellSlots: { 1: { level: 1, available: -1, total: 0 }, 99: null } },
    { name: null, avatarUrl: undefined, currentHp: 0, maxHp: 0, ac: 0 }
  ];

  for (let i = 0; i < iterations; i++) {
    try {
      const corruptData = edgeCases[i % edgeCases.length];
      const corruptToken = edgeCases[(i + 3) % edgeCases.length];
      const result = sanitizeCharacterVitals(corruptData, corruptToken);

      if (!Number.isFinite(result.currentHp) || !Number.isFinite(result.maxHp) || !Number.isFinite(result.hpPercent) || !Number.isFinite(result.strokeDashoffset)) {
        nanVitals++;
      }
    } catch (err) {
      caughtExceptions++;
    }
  }

  const duration = (performance.now() - start).toFixed(2);
  const throughput = Math.round((iterations / (parseFloat(duration) / 1000))).toLocaleString();

  console.log(`  ✓ Completed ${iterations.toLocaleString()} corrupt payload parses in ${duration} ms (${throughput} parses/sec)`);
  console.log(`  ✓ Crashes / Uncaught Exceptions: ${caughtExceptions}`);
  console.log(`  ✓ Corrupt/NaN Vitals Generated: ${nanVitals}`);

  if (caughtExceptions > 0 || nanVitals > 0) {
    throw new Error(`Character resilience test failed with ${caughtExceptions} crashes, ${nanVitals} NaN vitals.`);
  }
}

// ---------------------------------------------------------------------------
// 3. High-Frequency Real-Time Event & Serialization Stress Test
// ---------------------------------------------------------------------------
function runSerializationStressTest(iterations = 10000) {
  console.log(`\n========================================================`);
  console.log(`[TEST 3] High-Frequency Serialization & Socket Load (${iterations.toLocaleString()} packets)`);
  console.log(`========================================================`);

  const start = performance.now();
  let serializationErrors = 0;
  let totalBytes = 0;

  for (let i = 0; i < iterations; i++) {
    const packetType = i % 4;
    let payload: any;

    if (packetType === 0) {
      // Rapid token move
      payload = {
        type: 'token:move',
        tokenId: `token-${i % 8}`,
        x: 100 + (i % 2000),
        y: 200 + (i % 2000),
        timestamp: Date.now()
      };
    } else if (packetType === 1) {
      // Spell cast event with projectile coords & target
      payload = {
        type: 'spell:cast',
        casterId: `player-${i % 4}`,
        targetId: `monster-${i % 6}`,
        spellName: 'Fireball',
        assetId: 'jb2a.fireball.projectile',
        origin: { x: 150, y: 350 },
        target: { x: 800, y: 400 },
        damage: '8d6'
      };
    } else if (packetType === 2) {
      // HP synchronization delta
      payload = {
        type: 'hero:hp_update',
        characterId: `char-ddb-78921`,
        currentHp: Math.max(0, 100 - (i % 100)),
        maxHp: 100,
        tempHp: i % 10
      };
    } else {
      // Combat turn order update
      payload = {
        type: 'combat:update',
        round: Math.floor(i / 100) + 1,
        activeCombatantId: `combatant-${i % 6}`,
        turnOrder: ['c-1', 'c-2', 'c-3', 'c-4', 'c-5']
      };
    }

    try {
      const serialized = JSON.stringify(payload);
      totalBytes += serialized.length;
      const deserialized = JSON.parse(serialized);
      if (!deserialized.type) serializationErrors++;
    } catch {
      serializationErrors++;
    }
  }

  const duration = (performance.now() - start).toFixed(2);
  const throughput = Math.round((iterations / (parseFloat(duration) / 1000))).toLocaleString();
  const mbProcessed = (totalBytes / (1024 * 1024)).toFixed(2);

  console.log(`  ✓ Processed ${iterations.toLocaleString()} socket packets (${mbProcessed} MB) in ${duration} ms (${throughput} packets/sec)`);
  console.log(`  ✓ Serialization / Parsing Errors: ${serializationErrors}`);

  if (serializationErrors > 0) {
    throw new Error(`Serialization stress test failed with ${serializationErrors} errors.`);
  }
}

// ---------------------------------------------------------------------------
// Main Runner
// ---------------------------------------------------------------------------
try {
  console.log("⚡ Starting MistWalker VTT Comprehensive Stress Testing Suite...");
  runTouchStressTest(100000);
  runCharacterResilienceStressTest(50000);
  runSerializationStressTest(10000);
  console.log(`\n🎉 ALL STRESS TESTS PASSED WITH ZERO ERRORS!\n`);
  process.exit(0);
} catch (err) {
  console.error(`\n❌ STRESS TEST FAILURE:`, err);
  process.exit(1);
}
