# MistWalker: Pending Enterprise Patches Queue

> **Notice**: Automatic synchronization from `v1-stable` to `enterprise-multi-dm` is currently **PAUSED** per DM instructions.
> All fixes, enhancements, and adjustments made to the Production Stable mode (`v1-stable`) are recorded here. When requested, these changes will be batched and cleanly merged into Enterprise Beta (`enterprise-multi-dm`) as a coordinated release patch.

---

## Baseline Synchronization Checkpoint
- **Last Synchronized Commit**: `73d68a0` ("build: add dual-domain sync-and-deploy automation helper")
- **Sync Status**: `v1-stable` and `enterprise-multi-dm` are at parity up to this checkpoint.
- **Date**: 2026-10-29

---

## Pending Changes Queue for Future Enterprise Patch

### [2026-10-29] feat(silo): complete air-gap isolation between v1-stable and enterprise beta
- **Commit**: `f8f6f48`
- **Files Changed**:
  - `server.ts`
  - `src/lib/firebase.ts`
  - `src/lib/updateRoomAnnotation.ts`
  - `src/services/arenaConfigService.ts`
- **Summary**:
  - Implemented runtime domain detection (`IS_ENTERPRISE_BETA`), query filtering, and write boundaries across campaigns, uploadedAssets, monsters, allies, characters, mapZones, arenaConfig, and activeSession.
  - Added strict deletion barriers: Beta cannot delete non-beta assets/campaigns/monsters, and Stable cannot delete Beta documents.
  - Configured server-level static upload recovery filtering by service domain.
- **Impact / Testing Notes**:
  - Verify that Beta operates using the seeded `beta_` document namespace without affecting any Stable production records.

---

### [2026-10-29] feat(spells): cast cone spell attack from token edge closest to aim direction
- **Commit**: `dcb7246`
- **Files Changed**:
  - `src/effects/geometry/coneGeometry.ts`
  - `src/effects/index.ts`
  - `src/effects/render/DomEffectOverlay.tsx`
  - `src/effects/ui/AimReticle.tsx`
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
- **Summary**:
  - Implemented `getDirectionalConeOrigin` to compute the perimeter/edge intersection of the caster's token pointing towards the aim target.
  - Updated `<AimReticle />` cone wedge preview to render from the token's edge rather than center.
  - Updated `<DomEffectOverlay />` aiming preview and cone spell instance positioning to anchor at the perimeter edge.
  - Updated DM mode (`App.tsx`) and Player View (`PlayerView.tsx`) cone spell cast handlers so cone spell attacks emanate from the caster token's boundary facing the target.
- **Impact / Testing Notes**:
  - Verify cone spells (e.g. Burning Hands, Cone of Cold, Color Spray) emanate from the perimeter of the player token facing the aim cursor without obscuring the token.

---

### [2026-10-29] feat(combat): interactive manual d20 to-hit and damage prompt when auto roll is off
- **Commit**: `6e5f9fc`
- **Files Changed**:
  - `src/components/CombatDicePromptModal.tsx`
  - `src/components/ArenaDicePromptModal.tsx`
  - `src/components/PlayerView.tsx`
  - `src/components/PlayerArenaMode.tsx`
- **Summary**:
  - Implemented interactive two-step combat dice prompt modal when Auto Roll is toggled OFF for a player's HUD character.
  - Step 1 (To-Hit): Prompts player to roll d20 to hit with real-time target AC comparison and advantage/disadvantage pills; allows entering physical d20 result or rolling in-game 3D dice.
  - Misses resolve cleanly with audio and combat log announcement without prompting for damage.
  - Step 2 (Damage): On a hit (or for spells/heals requiring no attack roll), prompts player to input physical damage total or roll exact formula in-game in 3D (with doubled dice on critical hits).
  - Wired into both Player View (`PlayerView.tsx`) and Arena Mode (`PlayerArenaMode.tsx`), with live HP reduction, `REQUEST_TOKEN_MUTATION`, Blessed Healer auto-trigger, and on-the-fly "Turn On Auto Roll" toggle.
- **Impact / Testing Notes**:
  - Verify that when Auto Roll is OFF and an attack is cast from the HUD, the to-hit modal prompts first, followed by the damage modal on hit, supporting both manual input and 3D tumbling.

### [2026-10-29] feat(tokens): add debuff bubbles above enemy tokens and DM right-click bubble manager
- **Commit**: `bcaa1ae`
- **Files Changed**:
  - `src/effects/types/bubble.ts`
  - `src/effects/bubbles/bubbleCatalog.ts`
  - `src/effects/ui/TokenBubblesKonvaOverlay.tsx`
  - `src/effects/index.ts`
  - `src/effects/render/DomEffectOverlay.tsx`
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
- **Summary**:
  - Implemented Token Status Bubbles system for lasting debuffs (Hunter's Mark, Hex, Hold Person, Faerie Fire, Bane, Slow, etc.) and DM monster indicator badges.
  - After the main casting animation finishes (~2.8s), lasting debuffs automatically move into a small circular bubble above the enemy's head, looping the spell's animation inside the bubble.
  - Created `TokenBubblesKonvaOverlay` to render AC-style and orb-style badges in Konva above the token rim.
  - Updated `DomEffectOverlay` to composite hardware-accelerated looping WebM video animations inside debuff bubbles, complete with tooltips and click-to-remove.
  - Added "Bubbles" tab in DM monster right-click context menu with 16 1-click AC-style presets and a Custom Bubble Creator (label, sublabel/AC tag, icon, color palette, and styles).
  - All token status bubbles automatically sync between DM and Player View across the table.
- **Impact / Testing Notes**:
  - Cast Hunter's Mark or Hex on an enemy and verify the main animation plays for 2.8s, then transitions into a mini looping bubble above the enemy's head.
  - Right-click any monster as DM, open the Bubbles tab, and verify adding presets or custom bubbles places them above the monster's head.

---

### [2026-10-29] feat(arena): roll to hit first, then roll damage independently with correct dice types
- **Commit**: `6a63f3f`
- **Files Changed**:
  - `src/components/PlayerArenaMode.tsx`
- **Summary**:
  - Arena attack resolution (auto-roll) now always tumbles the d20 to-hit roll first (1d20, or 2d20kl1 with close-combat disadvantage), labeled HIT/MISS/CRITICAL vs target AC.
  - On a hit, the damage roll is shown as a separate 3D roll ~1.35s later using the weapon/spell's actual damage dice (e.g. 1d8, 2d6, 1d10 + 1d6), with dice doubled on crits.
  - Misses show only the d20 roll; no damage dice are rolled.
- **Impact / Testing Notes**:
  - In Arena Mode with Auto Roll ON, attack an enemy and verify two distinct roll toasts/3D rolls appear in order: d20 to-hit, then damage dice of the correct types.

---

### [2026-10-30] fix(intro): persist intro seen session state and wrap mode views in reactive crash recovery boundary
- **Commit**: `3fb8c81`
- **Files Changed**:
  - `src/main.tsx`
- **Summary**:
  - Added `sessionStorage.setItem(INTRO_SEEN_KEY, '1')` when choosing Adventurer (Player Mode) from the Intro Screen, preventing page reloads or crash recovery from bouncing the user back to the main menu.
  - Converted the static top-level `isPlayerView` constant into reactive `currentMode` state (`'dm' | 'player'`).
  - Wrapped both mode views inside `<CrashRecoveryBoundary>` dynamically, ensuring fallback title and recovery context accurately reflect the active mode.
- **Impact / Testing Notes**:
  - Click "Adventurer" from the main menu and verify it mounts Player View directly and stays on Player View without kicking back to the menu.

---

### Template for Incoming Entries:
```markdown
### [YYYY-MM-DD] <Title / Commit Short Summary>
- **Commit**: `<hash>`
- **Files Changed**:
  - `path/to/file`
- **Summary**:
  - Description of fix or enhancement.
- **Impact / Testing Notes**:
  - What to verify when merged into Enterprise Beta.
```
