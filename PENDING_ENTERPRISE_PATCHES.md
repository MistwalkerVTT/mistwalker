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

### [2026-10-30] fix(player): define autoApplyMonsterDamage state before callback dependencies to eliminate TDZ error
- **Commit**: `e70c2e9`
- **Files Changed**:
  - `src/components/PlayerView.tsx`
- **Summary**:
  - Moved `const [autoApplyMonsterDamage, setAutoApplyMonsterDamage] = useState<boolean>(true)` to the top state section of `PlayerView.tsx`, preceding `handleResolveCombatDamage` and `handleResolveCombatHit`.
  - Fixes the runtime exception `Cannot access 'yn' before initialization` caught by `CrashRecoveryBoundary` when mounting Player View.
- **Impact / Testing Notes**:
  - Load Adventurer (Player Mode) and verify the battlemap, tokens, HUD, and dice modals initialize cleanly without triggering the crash recovery screen.

---

### [2026-10-30] feat(arena): allow dm to create and delete battle arenas with custom walls and battlemaps
- **Commit**: `eebae43`
- **Files Changed**:
  - `src/components/ArenaManagerPanel.tsx`
  - `src/services/arenaConfigService.ts`
- **Summary**:
  - Added "+ Create Arena" button and modal dialog in Campaign Manager -> Battle Arena Manager allowing the DM to configure arena title, category tags, lore, background battlemap, and architectural wall presets (4 Tactical Pillars, Central Chokepoint Divide, Tactical Barricades, or Open Arena).
  - Added delete capability to all battle arenas in the pool (custom arenas removed from `customMaps`, preset arenas tracked in `deletedPresetMapIds`), including fallback default selection when the active arena is deleted.
  - Added "Delete Arena" button in the Arena Inspector panel for quick deletion with confirmation toast.
- **Impact / Testing Notes**:
  - Open Campaign Manager -> Battle Arena tab. Click "+ Create Arena", pick a name and backdrop, and verify the arena is created, selected, and immediately editable. Click "Delete Arena" or trash icon on any arena in the list to remove it from the pool.

---

### [2026-10-30] feat(hazards): implement unsafe zones, lava pits, chasm fall damage, and tactical AI avoidance
- **Commit**: `accde65`
- **Files Changed**:
  - `src/types/hazard.ts`
  - `src/lib/hazardGeometry.ts`
  - `src/types.ts`
  - `src/services/arenaConfigService.ts`
  - `src/services/arenaTacticalAi.ts`
  - `src/services/ai/arenaYukaBrain.ts`
  - `src/components/PlayerArenaMode.tsx`
  - `src/components/RoomHotspotLayer.tsx`
  - `src/components/AssignPolygonRoomModal.tsx`
  - `src/components/RoomBriefingDrawer.tsx`
  - `src/App.tsx`
- **Summary**:
  - Defined comprehensive Environmental Hazard models (`HazardType`, `HazardSeverity`, `HazardBypassRules`, `HazardZone`, `HAZARD_PRESETS` for lava, chasm fall damage, acid pool, spike pit, poison cloud, deep water, difficult ground).
  - Implemented `isPointInPolygon`, `isPointInHazard`, `isGridCellInHazard`, and `canCreatureBypassHazard` in `src/lib/hazardGeometry.ts`.
  - Added AI navigation constraint in `buildArenaWalkabilityGrid` and `YukaArenaMonsterBrain`: Ground AI strictly avoids pathfinding into lethal/dangerous hazards unless flying or damage-immune, preventing monsters from wandering into lava or off cliffs unconstrained.
  - Added preset lava hazards for volcanic `lavapit` battlemap and support in `ArenaConfig`.
  - Rendered hazard zones with ominous glowing dashed perimeters and danger badges on both Arena and Campaign battlemaps.
  - Added Unsafe Hazard Zone toggle and quick-select presets to `AssignPolygonRoomModal` and hazard configuration/briefing to `RoomBriefingDrawer`.
  - Added real-time hazard entry collision detection for token dragging with damage rolls, fall damage with prone condition, and warning notifications.
- **Impact / Testing Notes**:
  - In Arena Mode (e.g. `lavapit`), observe ground monsters pathfinding around the magma pools while flying monsters traverse them safely.
  - In Campaign Mode, trace a polygon and select "Unsafe Hazard Zone" to assign a lava pit or chasm, verifying visual rendering and movement triggers.

---

### [2026-10-30] fix(player-view,dm-view): resolve runtime crashes, missing hazard/arena imports, and tsc errors
- **Commit**: `e43dea7`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/ArenaManagerPanel.tsx`
  - `src/components/CombatDicePromptModal.tsx`
  - `src/components/CrashRecoveryBoundary.tsx`
  - `src/components/LeftSidebar.tsx`
  - `src/components/PlayerArenaMode.tsx`
  - `src/components/PlayerView.tsx`
  - `src/components/RoomBriefingDrawer.tsx`
  - `src/data/ddbCampaignRegistry.ts`
  - `src/lib/firebase.ts`
  - `src/types.ts`
  - `src/types/character.ts`
  - `src/types/hud.ts`
- **Summary**:
  - Fixed Player View TDZ runtime crash: hoisted `aimedAction` before `findLastingDebuffConfig` reference, and resolved unbound variables `targetToken`, `action`, `caster` in `handleQuickPlaceAsset`.
  - Fixed Player Arena Mode crash: imported missing `generateLavapitDefaultHazards`, `getArenaHazardAt`, `canCreatureBypassHazard`, and `HazardZone`.
  - Fixed DM View Arena Manager panel: imported missing `X` icon and wall generation algorithms (`generateColosseumPillarWalls`, `generateChokepointDivideWalls`, `generateTacticalBarricadeWalls`).
  - Fixed DM View `customAuraNameInput` and Konva drag cleanup references in `App.tsx`.
  - Improved `CrashRecoveryBoundary` to perform cache-busting refresh when catching unexpected token, import, or undefined module errors.
  - Resolved all TypeScript compiler errors across all components (`tsc --noEmit` clean with 0 errors).
- **Impact / Testing Notes**:
  - Verify Player View loads immediately without "Cannot access before initialization" or "generateLavapitDefaultHazards is not defined" crashes.
  - Verify DM View and Arena Manager load and operate without interruption.

---

### [2026-10-30] feat(arena): preserve organic map aspect ratio, add arena naming, and save arenas like campaign scenes
- **Commit**: `4083207`
- **Files Changed**:
  - `src/data/presetBattlemaps.ts`
  - `src/components/ArenaManagerPanel.tsx`
  - `src/components/PlayerArenaMode.tsx`
- **Summary**:
  - Removed hardcoded 22:14 (1320x840) distortion and aspect ratio forcing across the Battle Arena.
  - Added organic dimensions and aspect ratio support in `PresetBattlemap` (`mapWidth`, `mapHeight`, `gridSize`, `gridCols`, `gridRows`, `arenaTitle`).
  - Added dynamic aspect ratio calculation in `PlayerArenaMode.tsx` from `bgImage.naturalWidth` / `naturalHeight` and preset definitions, updating Stage, background `<Rect>`, `<KonvaImage>`, `<GridLayer>`, token bounds, camera centering/fitting, hazard checks, and spawn points to dynamically adapt without squashing or stretching.
  - Added Arena Naming feature: users can view and edit the Arena Name directly via inline input in the Lobby header, in the active battle top bar, and when saving.
  - Added Save Arena modal: allows naming and saving the arena into Arena Presets (`customMaps` with organic dimensions and walls) or saving directly into an existing Campaign and Chapter as a full Campaign Scene with combatants converted to `SceneTokens`.
  - Updated `ArenaManagerPanel.tsx`: image uploads automatically probe and store natural dimensions and grid layout; scene imports retain original dimensions and unscaled walls; the map preview renders with dynamic `aspectRatio` and grid lines matching the organic dimensions.
- **Impact / Testing Notes**:
  - When loading or uploading maps into Battle Arena (wide, square, or tall), verify the background image maintains its organic aspect ratio without distortion.
  - Verify editing the arena name in the Lobby and saving it to Arena Presets or Campaign Scenes.

---

### [2026-10-30] fix(arena): restore original tactical dimensions and unhide actions for original battle maps
- **Commit**: `0a04255`
- **Files Changed**:
  - `src/data/presetBattlemaps.ts`
  - `src/components/PlayerArenaMode.tsx`
  - `src/components/ArenaManagerPanel.tsx`
- **Summary**:
  - Restored original 4 preset battle maps (`forest-ruins`, `subterranean-maze`, `skeleton-crypt`, `lavapit`) in `presetBattlemaps.ts` to their authored 22×14 tactical colosseum specifications: `mapWidth: 1320, mapHeight: 840, gridSize: 60, gridCols: 22, gridRows: 14`.
  - In `PlayerArenaMode.tsx`, updated `dynamicArenaDims` to lock preset battle maps strictly to their authored 22×14 dimensions (1320×840 px, 60px grid) while retaining natural aspect ratio calculations for custom uploaded maps and imported campaign scenes.
  - Added "Restore Originals" button in `PlayerArenaMode.tsx` (Lobby map selector) and `ArenaManagerPanel.tsx` (Arena Map Pool toolbar) to clear `deletedPresetMapIds` and re-enable any disabled preset maps, immediately bringing back all original battle maps.
- **Impact / Testing Notes**:
  - Verify all 4 original battle maps load with their exact 22×14 grid and proper wall/hazard alignments.
  - Verify that clicking "Restore Originals" un-hides and recovers any deleted original maps.

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
