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

### [2026-11-04] feat(maps): integrate mbround18 community vtt pre-built maps repository
- **Commit**: `[PENDING]`
- **Files Changed**:
  - `src/data/vttMapRepository.ts`
  - `src/components/VttMapRepositoryModal.tsx`
  - `src/services/universalVttService.ts`
  - `src/components/LeftSidebar.tsx`
  - `src/App.tsx`
- **Summary**:
  - Integrated 64 curated pre-built Universal VTT (`.dd2vtt`) battlemaps from `mbround18/vtt-maps` covering Dungeons, Taverns, Travel, Spires, Forests, Encounters, and Towns.
  - Implemented `fetchAndParseRemoteUniversalVtt` in `universalVttService.ts` with streaming download progress.
  - Built interactive `VttMapRepositoryModal` with category filtering, search, size badges, and one-click loading.
  - Added repository browser launcher directly to the Map Library tab in `LeftSidebar.tsx` and automated full extraction of walls, doors, dynamic lighting, and calibrated grid onto the board and Firebase sync.

---

### [2026-11-03] refactor(campaign): remove complex adventure pdf importer in favor of standard upload digest
- **Commit**: `dc95195`
- **Files Changed**:
  - `src/components/CampaignBuilderModal.tsx`
- **Summary**:
  - Removed "Import from Adventure PDF" button, state (`isPdfImporterOpen`), and modal mount (`<CampaignPdfImporterModal>`).
  - Elevated standard "Upload PDF" button to primary call-to-action in the Chapter PDF header.
  - Standardized on the text/lore ingestion pipeline (`handleUploadAndDigestPdf` / `pdfDigest`) which non-destructively parses story beats, room keys, and boxed text without spawning phantom scenes or skewed wall coordinates.

---

### [2026-11-03] feat(grid): add interactive grid calibration box tracing tool to tactical layers
- **Commit**: `07f7a9e`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/LeftSidebar.tsx`
- **Summary**:
  - Added an interactive "CALIBRATE BY BOX" / "Trace Grid Square Box" tool in the Tactical Layers Grid panel.
  - Allows tracing an existing tile or printed square on a battlemap image with a click-and-drag box.
  - Automatically measures width and height, computes new `gridSize` and alignment offsets (`gridOffsetX`, `gridOffsetY`), aligns the grid to the drawn box, and snaps the virtual battle grid directly to the artwork.

---

### [2026-11-03] feat(tactical): separate descriptive badges from room zone labels and fix polygon save coercion
- **Commit**: `0abbc1b`
- **Files Changed**:
  - `src/types.ts`
  - `src/components/RoomHotspotLayer.tsx`
  - `src/components/RoomLabelEditorModal.tsx`
  - `src/components/LeftSidebar.tsx`
  - `src/App.tsx`
  - `src/lib/firebase.ts`
- **Summary**:
  - **Polygon Room Zone Normalization Bug**: Fixed the normalization coercion bug in `normalizeRoomAnnotation` where `typeof raw.visibleToPlayers === 'boolean'` inadvertently coerced completed polygon room zones into `'label'`, wiping `roomNumber` and rendering polygons as badge pills. Room zones with polygons are now strictly classified as `type: 'room'` with `roomNumber` preserved. Existing scenes with polygon points automatically self-heal upon load.
  - **Canvas Room Labels vs Badges Separation**:
    - *Room Zone Labels*: Rendered at the center of the drawn polygon with the room number/code (e.g. `Room 1`, `T1`, `V8`). Hovering over the room label highlights the drawn polygon on the canvas; right-clicking or clicking opens the room zone details / briefing drawer.
    - *Descriptive Badges*: Rendered as tactical badge pills for items, stairs, treasure, canopic jars, sarcophagi, pits, and descriptions, supporting custom glyphs and player visibility toggles.
  - **Tactical Layers Sidebar Overhaul (`LeftSidebar.tsx`)**:
    - Replaced ambiguous 3-button room tool layout with two clear primary tools: `[ Room Polygon ]` and `[ Descriptive Badge ]` with dedicated contextual guides.
    - Replaced the single combined "Rooms & Labels" list with a clean segmented filter (`All`, `Room Labels`, `Badges`) and two clearly separated sections:
      1. *Room Zone Labels ({count})*: Displays room number badge, title, polygon vertex count, hover-to-highlight on canvas, click to open details, and delete button.
      2. *Descriptive Badges ({count})*: Displays glyph icon, badge text, `Player Visible` / `DM Only` tag, click to edit badge, and delete button.
  - **Descriptive Badge Editor Presets (`RoomLabelEditorModal.tsx`)**: Expanded badge presets and icon glyphs to include Treasure (`🪙`), Urn / Canopic Jar (`🏺`), Sarcophagus / Tomb (`⚰️`), and Pit / Chasm (`🕳️`).

---

### [2026-11-02] fix(canvas): add optional chaining to selectionBox in Stage draggable prop
- **Commit**: `aa884a0`
- **Files Changed**:
  - `src/App.tsx`
- **Summary**:
  - Fixed runtime error `Cannot read properties of null (reading 'active')` when opening DM view by changing `!selectionBox.active` to `!selectionBox?.active` in Konva Stage's `draggable` prop.

---

### [2026-11-02] fix: guarantee spacebar hold-to-pan overrides all tools and objects in DM and Player view
- **Commit**: `5e8792b`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
  - `server/ddbGameLogDaemon.ts`
  - `src/components/DiceTableOverlay.tsx`
  - `src/components/PlayerHeroDock.tsx`
  - `src/components/RollSummaryToast.tsx`
  - `src/services/spellResolutionEngine.ts`
- **Summary**:
  - **Stage Draggable Gate Override**: Updated Stage `draggable` calculation in DM View (`App.tsx`) to `Boolean((isSpacePressed || isShiftPanActive) || (!isCanvasDrawingTool && !isDraggingToken && !hoveredZoneId && !isRoomDrawerOpen && !selectionBox.active))`. Previously, whenever any drawing or measurement tool (`wall`, `fog reveal`, `draw`, `erase`, `spell aim`, etc.) was active, `draggable` evaluated to false even while holding Spacebar.
  - **Token & Interactive Element Event Bubbling**: In `TokenItem` (`App.tsx`) and `PlayerToken` (`PlayerView.tsx`), bypassed `e.cancelBubble = true` and `draggable` when `isSpacePressed` is true. Clicking anywhere on the canvas (even on tokens, hotspots, or shapes) while holding Spacebar now smoothly initiates and maintains stage pan drag.
  - **Player View Spacebar Pan Parity**: Added `isSpacePressed` state, keyboard listeners (`keydown`, `keyup`, `blur`), grab cursor feedback, floating status indicator, and stage draggable override to `PlayerView.tsx`, enabling identical hold-to-pan fluid mouse controls in Player View.
- **Impact / Testing Notes**:
  - Select any drawing tool (e.g. Wall line tool, Fog polygon reveal, or Spell Aim) in DM View.
  - Hold down the Spacebar: cursor changes to `grab` and the "Pan / Move Map (Spacebar Held)" pill appears.
  - Click and drag anywhere on the map, including directly over tokens: the map pans fluidly without placing walls, dropping spells, or dragging tokens.
  - Open Player View and hold Spacebar: verify the same fluid hold-to-pan navigation works seamlessly.

---

### [2026-11-02] refactor(campaign): clean up Scene Manager modal layout, header flex wrapping, and play checkpoints panel
- **Commit**: `7388b99`
- **Files Changed**:
  - `src/components/CampaignBuilderModal.tsx`
- **Summary**:
  - **Modal Close (×) Button Relocation**: Moved the close button from the left action group to the far top-right header container (`ml-auto flex items-center gap-3`) styled as a dedicated `h-9 w-9` rounded-lg button.
  - **Scene Title Flex Crush Resolution**: Structured the middle header into two clean logical rows:
    - *Top Row*: Thumbnail, Campaign/Chapter breadcrumbs, editable scene title (`min-w-[220px] flex-1 text-xl font-bold truncate`), and stat pill badges (`tokens`, `walls/doors`, `rooms`).
    - *Action Toolbar Row*: Wrapped the primary and secondary scene actions (`Load Base Blueprint`, `DM1 | DM2 | DM3`, `Blueprint Save`, `Pull Blueprint from Canvas`, `Add Scene`, `Duplicate`, `Import`, `Export`, `Delete`) into a dedicated `flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-850/80` row underneath, preventing any lateral compression on the title.
  - **Redesigned Live Game Instances Panel**:
    - Enhanced parent grid layout to `grid-cols-1 xl:grid-cols-12 gap-6` with `xl:col-span-5 min-w-[340px]` for play checkpoints.
    - Simplified card header with single clean badge (`N Saves`) and full-width subtitle.
    - Refactored "Capture Live Table State" box into a vertical stack with a full-width input, full-width save button (`w-full h-9`), and clear helper text.
    - Converted saved checkpoints into a vertical two-row card with title/metadata on top and action buttons (`▶ Resume Game`, `↻ Overwrite`, `🗑 Delete`) spanning cleanly across the bottom.
- **Impact / Testing Notes**:
  - Open Campaign Builder & Scene Manager.
  - Verify the modal close button is in the far top-right corner.
  - Inspect the selected scene header: scene title now has ample horizontal room and actions sit cleanly below it.
  - Test saving a new play checkpoint: text input and button are full width with zero clipping or text crushing.

---

### [2026-11-02] fix(dashboard): eliminate startup scene hydration flicker with synchronous metadata cache and loading skeleton
- **Commit**: `5320cd8`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DashboardHomeHub.tsx`
- **Summary**:
  - **Eliminated Startup Card Race Condition**: Resolved the race condition where `DashboardHomeHub` briefly displayed the default "Guild House" fallback on frame 1 while `campaignsList` was empty, before switching to "Three Moons Vault" (latest timestamp scan) and then finally "Three Moons Dungeon" (Firestore active session arrival).
  - **Synchronous Frame-1 Local Cache**: Stored self-contained metadata (`mistwalker_last_active_scene_meta`) with scene ID, title, campaign title, chapter title, thumbnails, token count, and wall count whenever a scene loads or saves. Read synchronously on initial render in both `App.tsx` and `DashboardHomeHub.tsx` so the true last active scene appears immediately on frame 1.
  - **Dark Pulsing Skeleton Gate**: Introduced `isHydratingScene` state. If no local cache exists yet on a cold device and cloud hydration is still pending, the "Resume Adventure" card renders a subtle dark pulsing skeleton instead of flashing the demo "Guild House" template.
- **Impact / Testing Notes**:
  - Reload MistWalker on desktop or mobile.
  - Observe the "Resume Adventure" card: it renders the true last active scene ("Three Moons Dungeon") instantly on frame 1 with 0 flicker or mid-load layout shifts.

---

### [2026-11-01] feat(campaign): separate map blueprints from live game session checkpoints with dedicated scene instance service and 2-column detail UI
- **Commit**: `4413c1b`
- **Files Changed**:
  - `src/types.ts`
  - `src/lib/firebase.ts`
  - `firestore.rules`
  - `src/services/sceneInstanceService.ts`
  - `src/components/CampaignBuilderModal.tsx`
  - `src/App.tsx`
  - `src/components/DmMonsterDock.tsx`
  - `src/components/PlayerHeroDock.tsx`
- **Summary**:
  - **Strict Separation Between Blueprints and Session Saves**:
    - Introduced the `ScenePlayInstance` data model representing point-in-time runtime table saves, distinct from pristine `Scene` templates.
    - Encapsulated CRUD persistence in `src/services/sceneInstanceService.ts` with dual-domain isolation and localStorage offline fallback caching keyed by `mistwalker_play_instances_${sceneId}`.
    - Added security rule for `/scenePlayInstances/{instanceId}` in `firestore.rules`.
  - **Responsive Two-Column Detail View in Scene Manager**:
    - **Left Column (Map Authoring Blueprint)**: Clear labeling on "Load Base Blueprint (Fresh Reset)", "Blueprint Save (Map Maker)", and "Pull Blueprint from Canvas". Protects original map templates, walls, room notes, and starting monster spawns.
    - **Right Column (Live Game Instances / Play Saves)**: "🎮 Live Game Instances (Play Saves)" panel with a "Capture Current Table State Bar" (custom checkpoint name input + "+ Save Current Game Instance" snapshot button) and scrollable checkpoint list.
    - Each checkpoint card displays timestamp, DM slot, token count, combat round, and fog reveals, with 1-click **Resume Game** (loads blueprint + overlays runtime tokens/walls/fog/combat and broadcasts via Socket.IO), **Overwrite** (↻), and **Delete** (🗑).
    - Preserves pristine blueprints so checkpoint saves never overwrite base scene templates.
- **Impact / Testing Notes**:
  - Open Campaign Builder & Scene Manager (`Scenes & Chapters`).
  - Select any scene (e.g., Three Moons Dungeon).
  - Verify left column displays Map Authoring Blueprint (Creator Setup) with "Load Base Blueprint (Fresh Reset)" and "Blueprint Save (Map Maker)".
  - Verify right column displays Live Game Instances with "+ Save Current Game Instance" and checkpoint history.
  - Test saving a checkpoint, overwriting, and resuming mid-combat table states.

---

### [2026-11-01] feat(player): add campaign selection and live DDB player verification after station mode choice
- **Commit**: `a710aea` (with follow-up `cd93662`)
- **Files Changed**:
  - `src/components/PlayerCampaignSelectModal.tsx`
  - `src/components/PlayerCharacterSelectModal.tsx`
  - `src/components/PlayerArenaMode.tsx`
  - `src/components/PlayerView.tsx`
  - `src/data/defaultCharacters.ts`
- **Summary**:
  - **Campaign Selection Gate After Station Choice**: When a player accesses Player Mode and selects from the station choices (Link to DM / Remote Player, TV Table, or Arena Mode), they are immediately presented with `PlayerCampaignSelectModal` to choose their campaign first before entering the mode.
  - **Live Campaign Player Roster & Instant D&D Beyond Refresh**:
    - Queries `POST /api/ddb/campaigns/select` to activate the campaign on the server and fetch live characters from D&D Beyond.
    - Displays confirmed party roster with character avatars, character names, player name tags, race, class, level, Max HP, and AC to visually verify and confirm the team.
    - Provides a "Quick Refresh" button to re-sync live stats from D&D Beyond in one click, plus a robust fallback to verified compendium characters if offline.
    - Seamlessly persists chosen campaign in `sessionStorage` (`mistwalker_active_campaign_id`, `mistwalker_active_campaign_title`).
  - **Mode Handoff & Campaign Filtering**:
    - **Remote Player Mode**: Passes the selected campaign to `PlayerCharacterSelectModal` (`initialCampaignId`) so characters are pre-filtered to the chosen campaign, or allows 1-click launch directly from the campaign player card.
    - **Arena Mode**: Pre-populates Gold and Crimson combatant filters with the selected campaign (`initialCampaignId`).
    - **TV Table Mode**: Initializes digital TV table with the campaign roster active.
  - **Always-Accessible Campaign Switcher**: Added an interactive Campaign button pill (`<Folder />`) in the Player View sidebar header (both collapsed and expanded view) next to the Station Mode switcher so players can switch or re-verify campaigns at any time without resetting their session.
  - **Character Collision Guard & Noctua Restoration**: Fixed duplicate character ID assignment between Brannoc and Noctua Shadowclaw in `defaultCharacters.ts`, and hardened `isDdbMatch` against duplicate collisions between distinct characters sharing IDs.
- **Impact / Testing Notes**:
  - Open `/player` or reset station mode.
  - Click any mode (Link to DM, TV Table, Arena).
  - Observe `PlayerCampaignSelectModal` appears showing available campaigns (Keys from the Golden Vault, An Unspeakable Power, etc.).
  - Selecting a campaign auto-pulls and confirms all characters with full stats and avatars.
  - Click "Confirm & Continue" or click any character card to enter gameplay.
  - Verify campaign badge appears in sidebar header and can be clicked to re-verify roster.

---

### [2026-11-01] fix(dm-hud): route monster attacks to target tokens with animations, hp deduction, and dice resolution
- **Commit**: `a46f83b`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DmMonsterDock.tsx`
- **Summary**:
  - **Eliminated Stage MouseDown & Selection Hijack**: Fixed critical bug where clicking a player token while aiming a monster attack was intercepted by `handleStageMouseDown` (which fired an untargeted ground roll via `castSpellAt` and reset `tool` to `'pan'`), causing subsequent `TokenImage.onClick` to deselect the monster and select the player token.
  - **Proximity Snap & Magnetic Targeting**: Implemented `findTargetTokenFromPoint` in `App.tsx` matching `PlayerView.tsx`. Clicks or taps on or within proximity radius of any player/creature token route directly to `handleDmTargetToken`. Clicking open ground during a single-target attack provides an advisory toast without canceling aiming or wasting attacks into the dirt.
  - **Player Sheet AC & HP Resolution**: Resolved player token stats using `resolveTokenCharacterStats(targetToken, compendiumCharacters)` so monster attacks compare against the player's true Armor Class and Max HP rather than fallback defaults.
  - **Full Dual-Mode Combat Resolution**:
    - **Auto Roll ON**: Automatically executes d20 to-hit vs target AC (critical hit on 20, fumble on 1), calculates damage (doubling dice on criticals), triggers 3D physics dice (`__mistwalkerRoll3d` and `SYNC_LOCAL_DICE_ROLL`), deducts HP from player token (factoring in temporary HP), updates tracker, and emits `SYNC_TOKENS` with `prepareTokensForSync`.
    - **Auto Roll OFF**: Plays visual animation and sound effect immediately, then prompts DM via `CombatDicePromptModal` to roll or input to-hit and damage manually.
  - **Persistent Monster Selection**: Retains monster token selection after targeting/attacks so DMs can seamlessly perform Multiattack without re-selecting the creature.
  - **Auto Roll UI Toggle**: Polished the "Auto Roll: ON / OFF" switch button in `DmMonsterDock` vital bar for high-visibility across all screen sizes.
- **Impact / Testing Notes**:
  - Select a monster token as DM, click an attack card or "Aim" button on the DM Monster HUD, and click a player token on the map.
  - Verify the attack animation and sound effect play at the player's token.
  - Verify with Auto Roll ON that d20 rolls against player's AC, 3D dice roll on screen, player token HP decreases, and player client updates live.
  - Verify with Auto Roll OFF that the visual animation plays and the manual/3D dice prompt modal opens.
  - Verify the monster token remains selected after resolving an attack.

---

### [2026-11-01] feat(effects): allow DM to dispel any player effect and synchronize bidirectional cancellation
- **Commit**: `2502858`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/PlayerHeroDock.tsx`
  - `src/effects/render/DomEffectOverlay.tsx`
- **Summary**:
  - **Universal DM Dispel Authority**: Added `isDM` mode to `DomEffectOverlay` so that the DM always sees on-map clickable dispel badges (`X`) for all effects placed by players on the battlemap or tokens (including one-shot blasts, concentration spells, and token-equipped auras).
  - **DM Token Aura Clearing**: Passed `onClearTokenAura` and `onRemoveTokenBubble` to `DomEffectOverlay` in `App.tsx` with full state updates and WebSocket broadcasts, allowing the DM to dismiss player token auras with one click.
  - **Player Hero Dock Dispel**: Added quick "Dispel Active Spell" buttons to the action inspection card and modal in `PlayerHeroDock`, allowing players to dismiss their active spells or auras directly from their HUD sheet.
  - **Bidirectional WebSocket Sync**: Ensured any effect cancellation via `handleDispelEffect` or token aura removal broadcasts `EFFECT_REMOVE` / `SYNC_TOKENS` across all connected clients immediately, cancelling on both DM and player views simultaneously. Added `effects` state hydration to `SYNC_STATE` in `App.tsx`.
- **Impact / Testing Notes**:
  - Have a player place a persistent effect, token aura, or lasting spell. Verify the DM immediately sees the dispel pin on the battlemap.
  - Verify clicking dispel as DM removes the effect on both DM and player screens instantly.
  - Verify when a player cancels their own effect (via on-map pin or PlayerHeroDock), it immediately disappears from DM mode.

---

### [2026-11-01] feat(auras): replace aura of life/vitality animations and update boundary circle styling
- **Commit**: `40712b0`
- **Files Changed**:
  - `src/effects/render/DomEffectOverlay.tsx`
  - `src/effects/db/jb2aRegistry.ts`
  - `src/effects/db/tokenFxMap.ts`
  - `src/types/aura.ts`
- **Summary**:
  - **Aura of Life**: Completely replaced the old intense burst with the high-fidelity JB2A looping nature orbit animation (`/jb2a/Library/Generic/Template/Circle/Aura/AuraThemedOrbitLoopNature01_01_Regular_Green_700x700.webm`), providing a clean, subtle circulating preservation ward.
  - **Aura of Vitality**: Replaced the harsh template with the official JB2A looping healing ability asset (`/jb2a/Library/Generic/Healing/HealingAbility_02_Regular_GreenOrange_Loop_600x600.webm`), delivering gentle pulsing restoration particles.
  - **Boundary Circle Color Rules**:
    - **Aura of Protection**: Circle changed to **white** (`#ffffff`).
    - **Aura of Courage**: Circle changed to **red** (`#ef4444`).
    - **Antilife Shell**: Circle changed to **blue** (`#3b82f6`).
  - **Excluded From Boundary Circles**: Removed external perimeter lines from `Spirit Guardians`, `Darkness`, `Wall of Fire`, `Shield of Faith`, and `Fog Cloud`.
- **Impact / Testing Notes**:
  - Cast or equip Aura of Life & Aura of Vitality and verify smooth, subtle animations with no visual clutter.
  - Verify Aura of Protection displays a crisp white outline circle, Aura of Courage displays a red circle, and Antilife Shell displays a blue circle.
  - Verify Spirit Guardians, Darkness, Wall of Fire, Shield of Faith, and Fog Cloud do not render boundary lines.

---

### [2026-11-01] feat(vtt): unify DM mouse and touch interaction to match fluid Player View mechanics
- **Commit**: `40712b0`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/LeftSidebar.tsx`
  - `src/effects/db/jb2aRegistry.ts`
  - `src/effects/db/tokenFxMap.ts`
  - `src/effects/render/DomEffectOverlay.tsx`
  - `src/types/aura.ts`
- **Summary**:
  - Brought complete parity with Player View's fluid mouse and touch interaction model to the DM interface:
    - **Native Draggable Stage**: Made Konva Stage natively draggable during navigation (`!isCanvasDrawingTool && !isDraggingToken`) so dragging empty canvas immediately pans the map with hardware-accelerated smoothness on desktop and mobile without requiring tool mode switches or spacebar.
    - **Clean Deselection & Dismissal**: Clicking on empty canvas cleanly deselects tokens and dismisses menus without lag; Shift+drag activates marquee multi-selection.
    - **Solid Token Interaction**: Added `onMouseUp` event handling with propagation stop to `TokenImage` and enforced minimum 48px touch hit-target radius so tokens never miss clicks or drops.
    - **Mobile Touch Streamlining**: Replaced artificial JS single-finger panning loop with Konva's native stage drag; removed artificial 450ms touch suppression delay for instant tap response.
    - **Cursor Styling Parity**: Matched Player View cursor states (`cursor-default` canvas, `cursor-grab` hovering tokens, `cursor-grabbing` dragging tokens, `cursor-crosshair` aiming).
- **Impact / Testing Notes**:
  - On both desktop and mobile, click and drag empty canvas to pan the map with zero lag.
  - Click on any token to select and view HUD; click empty canvas to cleanly deselect.
  - Drag tokens to move; pinch with two fingers to zoom smoothly.

---

### [2026-11-01] feat(dm-hud): add auto-roll toggle and direct attack card targeting with manual/3d dice prompt
- **Commit**: `3df4862`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DmMonsterDock.tsx`
  - `src/services/monsterHudService.ts`
- **Summary**:
  - Brought complete Player HUD parity to the DM Monster HUD for attacks, actions, targeting, and animations:
    - **Interactive Auto Roll Toggle Switch**: Added the `Auto Roll: ON / OFF` toggle pill in the DM monster dock header. Allows DM to choose between full automatic dice rolling & HP mutation or visual animations with manual/3D roll prompts.
    - **Click-to-Aim Anywhere on Attack Card**: Clicking an attack or action card anywhere immediately arms targeting, launches the projectile/aiming reticle and displays the pinned Aiming banner with `[Target Self]` and `[Cancel]`.
    - **Target Token Selection, Animations & SFX**: Clicking any token on the battlemap triggers the respective JB2A visual effect and audio.
    - **Combat Prompt Modal When Auto Roll is OFF**: If Auto Roll is turned OFF, targeting plays the spell/attack animation on the target and opens `CombatDicePromptModal`, allowing the DM to input their manual physical dice roll or click to roll 3D dice in MistWalker, then resolve damage or toggle auto roll.
    - **Offensive Action Target Classification**: Fixed bug in `monsterHudService` where actions with no reach or missing explicit range were misclassified as self-actions and defaulted to `'Self'`, preventing targeting; offensive actions and attacks now properly enter aiming mode and default to reach 5 ft.
- **Impact / Testing Notes**:
  - Select any monster token as DM. Click any attack card (e.g. Moonlight Slam or Moonlight Blast).
  - Target reticle appears and connects to cursor. Click a target token on the battlemap.
  - With Auto Roll ON: strike animation plays, d20 attack rolls vs AC, damage rolls in 3D physics dice, and target token HP updates automatically.
  - With Auto Roll OFF: strike animation plays immediately, then prompt modal opens for manual or 3D dice input. Toggle Auto Roll ON/OFF anytime in the monster header.

---

### [2026-11-01] fix(vtt): restore original unified pointer and pan interaction in DM view
- **Commit**: `647b02f`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DynamicLightingLayer.tsx`
- **Summary**:
  - Restored original unified pointer & pan workflow as default DM interaction mode:
    - Default tool state set to `'pan'` where hovering and dragging tokens directly interacts with tokens, while dragging empty canvas pans the battlemap.
    - Removed `listening={tool !== 'pan'}` from `<Layer>` in `App.tsx` and `DynamicLightingLayer.tsx` so tokens and creator walls remain interactive and draggable under pan tool.
    - Restored stage mouse move handling and left-click hold map ping in pan tool.
    - Updated targeting cancel and action completion handlers to return to `'pan'` tool.
- **Impact / Testing Notes**:
  - In default DM view, clicking or dragging tokens moves/selects them normally, while clicking and dragging empty map pans the battlemap smoothly.
  - Wall interactions in creator mode remain active.

---

### [2026-11-01] feat(dm): make all DM monster HUD buttons fully interactive with checks, saves, initiative, and multi-damage rolls
- **Commit**: `f393c1a`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DmMonsterDock.tsx`
- **Summary**:
  - Made every button on the DM Monster HUD dock fully functional:
    - **Ability Score Buttons (STR, DEX, CON, INT, WIS, CHA)**: Left-clicking rolls an Ability Check (`1d20 + mod`) in 3D physics dice and broadcasts to the chat log. Right-clicking rolls a Saving Throw (`1d20 + saveMod`) in 3D dice.
    - **Initiative Roll Button ([INIT +X])**: Clicking rolls initiative (`1d20 + initiativeBonus`) in 3D dice and automatically sets or updates the monster's initiative in the Combat Tracker and token state across all clients.
    - **Passive Perception Button ([PP XX])**: Clicking rolls an active Perception Check (`1d20 + (PP - 10)`) in 3D physics dice.
    - **Armor Class ([XX AC]) & Speed ([XX ft.]) Buttons**: Made clickable with rule inspection and speed mode breakdown tooltips.
    - **Save DC Badges ([DC XX]) on Action Cards**: Made clickable; rolls saving throw checks vs the DC in 3D physics dice.
    - **Secondary Damage Badges ([Plus +XdY])**: Now rendered and clickable for complex multi-damage monster attacks (such as Moonlight Slam: 1d8 + 4 bludgeoning plus 1d8 radiant).
    - **Quick [Roll] Button Upgrade**: Now rolls the d20 attack together with all primary and secondary damage dice tumbling simultaneously in 3D physics dice, or rolls the damage dice + save check together for saving throw abilities.
- **Impact / Testing Notes**:
  - Click any ability score pill in the monster dock to roll an ability check in 3D dice. Right-click to roll a saving throw.
  - Click `[INIT]` on the monster dock to roll initiative and verify it updates the Combat Tracker.
  - Click `[PP]` to roll perception. Click `[DC XX]` to roll a saving throw check.

---

### [2026-11-01] feat(dm): expand DM monster HUD with tactical targeting, aiming banner, interactive rolls and traits
- **Commit**: `ff8309d`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DmMonsterDock.tsx`
  - `src/services/monsterHudService.ts`
- **Summary**:
  - Expanded DM mode monster dock (`DmMonsterDock`) to parity with the player hero HUD:
    - Added pinned Aiming Banner while an action is active with action name, [Hit +X], [DC Save], [Dmg formula], Range, [Target Self], and [Cancel Aiming].
    - Prevented unwanted auto-collapse when aiming so all dock controls, vital bars, and stats remain fully accessible.
    - Added Action Category glyphs (Swords, Zap, Sparkles, Shield, Crown) and separate buttons on action cards: [Hit], [Dmg], [Aim], [Roll], and [DC Save].
    - Fixed damage button behavior to roll damage directly rather than re-triggering aim mode.
    - Added rule & spell inspection support on action cards and traits via right-click context menu and `(i)` info icon (`DndRuleInspectionModal`).
    - Made Traits & Defenses interactive: added rollable healing/damage buttons for traits (e.g. Regeneration, Stench), recharge toggles/rolls, and clickable senses/resistances/immunities.
    - Implemented full tactical token targeting in DM mode: clicking any token on the battlemap (`TokenImage`) while aiming an attack or action strikes that creature directly.
    - Integrated combat resolution for targeted tokens: grid distance calculation & range advisories, JB2A visual projectile/burst/line animations and sound effects, attack rolls vs target AC with critical hit/miss detection, saving throw checks, live HP deduction from targeted token (with temp HP priority), synchronization across clients via `SYNC_TOKENS`, rich combat toasts, and 3D physics dice broadcast.
- **Impact / Testing Notes**:
  - Select a monster token as DM, click [Aim] on any attack or saving throw action, and click another token on the battlemap. Verify animation fires, dice roll, combat log posts, and target HP updates in real-time.
  - Verify [Hit] and [Dmg] buttons roll their respective formulas directly with 3D physics dice.
  - Verify traits tab features clickable roll/heal buttons and inspect buttons.

---

### [2026-11-01] perf(vtt): optimize map dragging with fog offscreen canvas and set DM default tool to select
- **Commit**: `c4fefb7`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DmMonsterDock.tsx`
  - `src/components/DynamicLightingLayer.tsx`
  - `src/components/PlayerView.tsx`
  - `src/services/monsterHudService.ts`
- **Summary**:
  - Set DM Mode default tool from `pan` to `select`, ensuring mouse interactions, selection boxes, and character token claiming default cleanly on startup.
  - Eliminated map drag stutter and frame drops by implementing high-performance offscreen canvas caching for fog carve-outs (`fogFovLayer`) and ambient lighting (`ambientLightingLayer`), updating the pre-rendered canvas only when tokens, vision, walls, or reveals change and drawing the cached texture via `<KonvaImage>` in ~0.02ms during panning.
  - Set `Konva.hitOnDragEnabled = false;` and capped `Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);` to prevent expensive offscreen hit-canvas re-rasterization and ultra-high-DPI overdraw.
  - Optimized layer listening: disabled hit-testing on the token layer (`listening={tool !== 'pan'}`) and wall layer (`listening={campaignMode === 'creator' && tool !== 'pan'}`) during pan mode.
  - Added fast guard in `handleMouseMove` to return immediately when panning or dragging, and avoided hold-ping state thrashing on mouse down when in pan mode.
  - Added RAF throttling to single-finger touch panning on mobile devices to sync with 60/120Hz V-Sync refresh rate.
  - Restored missing `setEffects`, `soundCatalog.play`, `EFFECT_SPAWN`, and monster action roll execution in DM View `castSpellAt`.
  - Added automatic collapse for `DmMonsterDock` while targeting attacks and offset mobile sidebar positioning.
  - Fixed PlayerView claimed token auto-reconciliation when joining before tokens arrive, refined creature targeting with magnetic token snapping, and added lasting debuff badge transitions.
- **Impact / Testing Notes**:
  - Test map dragging with pan tool, spacebar, and touch on both low-spec and high-DPI screens; verify smooth 60/120 FPS map movement.
  - Verify DM mode loads with the select tool active by default.

---

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

### [2026-10-30] feat(intro): add prominent mute toggle button to launch screen with audio and greeting silence
- **Commit**: `22f4303`
- **Files Changed**:
  - `src/components/IntroScreen.tsx`
- **Summary**:
  - Added a prominent, always-visible glassmorphism Mute / Unmute Audio toggle button in the top-right corner of the DM/Player selection launch screen (`IntroScreen.tsx`).
  - Uses `Volume2` and `VolumeX` icons from `lucide-react` with animated glow, state pill badges, and hotkey support (`M`).
  - Persists the user's mute preference across sessions in `localStorage` (`mistwalker_intro_muted`).
  - When muted, completely suppresses all audio: ambient synthesizer drone gain is kept at 0, portal transition explosion sound effects are skipped, and ElevenLabs spoken greetings ("Welcome Dungeon Master" / "Welcome Adventurer") are bypassed, instantly revealing the next screen in silence.
- **Impact / Testing Notes**:
  - Load the launch screen on a fresh session.
  - Verify the mute button is immediately visible in the top-right corner.
  - Click "Muted" or press `M`, select "Dungeon Master" or "Adventurer", and verify no audio/voice plays and the screen transitions smoothly into the app.

### [2026-10-31] Campaign Builder scene header reorganization + thumbnail fallback
- **Commit**: `7d525a0`
- **Files Changed**:
  - `src/components/CampaignBuilderModal.tsx`
- **Summary**:
  - Scene header split into thumbnail + title/stat chips, primary actions (Load Live, DM1-3, Save) and a secondary tools row.
  - Scene preview/thumbnail falls back to the saved thumbnail (then a placeholder) when the full map image fails to load.
- **Impact / Testing Notes**:
  - Verify header wraps cleanly in narrow modals; whole-file line endings changed in this commit.

---

---

### [2026-10-31] fix(scenes): resolve scene map loading failures with resilient dual useImage, fast asset resolver, and thumbnail fallback
- **Commit**: `9d74acc`
- **Files Changed**:
  - `src/App.tsx`
  - `src/lib/firebase.ts`
- **Summary**:
  - Replaced the blocking 6000ms probe in `testMediaAccessible` with a fast 1500ms probe, preventing UI freezes when loading scenes.
  - Removed restrictive `scene.mapUrl !== scene.mapThumbnailUrl` checks across `resolveMapSource` and `handleLoadSceneFromCampaign` that rejected maps when `mapUrl` matched or was backed by `mapThumbnailUrl`.
  - Implemented dual-strategy `useImage` in DM View (`App.tsx`) with anonymous CORS probe and no-CORS fallback matching `PlayerView.tsx`, preventing cross-origin failures from blanking the canvas.
  - Added automatic fallback to `activeSceneInfo.mapThumbnailUrl` in the image load failure handler so battlemaps never display as empty blank surfaces.
  - Enabled scene loading even when `scene.mapUrl` is empty by falling back to `resolveMapSource` / `mapThumbnailUrl` rather than aborting with an error toast.
  - Synchronized slot mutations (`roomAnnotations`, `boardAnimatedFeatures`, and pre-calculated `fitScale`/`fitPos`) on `targetSlot` (`DM1`/`DM2`/`DM3`) instead of the asynchronous `activeMapId`.
  - Corrected `lastFittedAssetRef` auto-fitting to track actual loaded image/video asset dimensions rather than pre-firing on stale images.
  - Initialized viewport `dimensions` safely with window dimensions to prevent negative Stage widths.
- **Impact / Testing Notes**:
  - Load scenes across `DashboardHomeHub` ("Resume Primary Scene"), `LoadCampaignModal` ("Load Live" and slot buttons), and `CampaignBuilderModal` ("Launch Scene to VTT").
  - Verify full-resolution local static uploads (`/uploads/...`), external HTTP images, and thumbnail fallbacks all render smoothly without blank screens or false error toasts.

---

### [2026-10-31] feat(tokens): rename bubbles to Badges, remove AC Style text, and render menu icons directly on badges
- **Commit**: `072c604`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
  - `src/effects/bubbles/bubbleCatalog.ts`
  - `src/effects/db/jb2aRegistry.ts`
  - `src/effects/db/tokenFxMap.ts`
  - `src/effects/index.ts`
  - `src/effects/render/DomEffectOverlay.tsx`
  - `src/effects/types/bubble.ts`
  - `src/effects/ui/TokenBubblesKonvaOverlay.tsx`
  - `src/types/aura.ts`
- **Summary**:
  - Renamed all UI references from "Bubbles" to "Badges" in DM and Player menus, active badge headers, removal actions, and creator controls.
  - Removed "AC-Style" text from the 1-click preset badges section.
  - Replaced tiny WebM micro-video animations on badges with the exact crisp, readable icons/emojis displayed in the Badges menu, eliminating slowdowns and visual clutter on tokens.
- **Impact / Testing Notes**:
  - Right-click an enemy or token as DM and open the "Badges" tab.
  - Verify "AC-Style" label is gone.
  - Click preset badges (e.g. Hunter's Mark, Hex, Bane, Shield Buff, Bloodied, Boss Monster) and verify the badge appears above the token displaying the exact clear icon from the menu.

---

### [2026-10-31] perf(vtt): 60+ FPS map movement & panning optimization (Phase 1)
- **Commit**: `072c604`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
- **Summary**:
  - Decoupled stage dragging from continuous React state updates (`setStagePos`) during `onDragMove`, letting Konva manage hardware-accelerated canvas panning natively without triggering 120 React tree diffs per second. React state is now committed only on `onDragEnd`.
  - Upgraded animated FX overlays and DOM effects layer (`mistwalker-dom-effects-overlay-world`) to translate via `requestAnimationFrame` with GPU-accelerated CSS `transform: translate3d(x, y, 0)`, eliminating layout thrashing.
  - Batched wheel zooming via `requestAnimationFrame` and applied instant Konva canvas transform updates.
  - Wrapped `mapDimensions` in `useMemo` in both DM view and Player view, and stabilized callbacks (`noopSelectWall`, `STATIC_MOUSE_POS`, `handleSelectWall`), enabling `React.memo` to properly skip re-rendering `DynamicLightingLayer`, `RoomHotspotLayer`, and animated features during pan/drag operations.
- **Impact / Testing Notes**:
  - Pan the map rapidly using right-click drag, pan tool, spacebar, or trackpad in both DM view and Player view.
  - Verify map panning is buttery smooth (60+ FPS) with zero frame drops or lag spikes.
  - Zoom in and out rapidly with mousewheel/trackpad and confirm smooth scaling with zero stutter.
  - Verify dynamic lighting, fog of war, walls, doors, badges, and tokens stay perfectly positioned during and after dragging.

---

### [2026-10-31] feat(auras): refine aura sizing, boundary circles, and accelerate animation playback
- **Commit**: `9f1ce4f`
- **Files Changed**:
  - `src/effects/render/DomEffectOverlay.tsx`
  - `src/types/aura.ts`
  - `src/effects/db/tokenFxMap.ts`
  - `src/effects/db/jb2aRegistry.ts`
- **Summary**:
  - Re-tuned opacities for subtle auras (Aura of Life: 0.35, Aura of Vitality: 0.35, Aura of Protection: 0.35, Aura of Courage: 0.35, Crusader's Mantle: 0.45, Twilight Sanctuary: 0.45).
  - Increased barrier opacity for Antilife Shell (0.8) and Armor of Agathys (0.8).
  - Reworked Crusader's Mantle mapping to high-definition JackKerouac Lathander Symbol sunburst.
  - Added clean circular boundary outlines (`border: 2px solid`, subtle glowing box-shadow) enclosing circular auras and matching spell theme colors.
  - Corrected aura sizing formulas in `DomEffectOverlay` so 30ft auras accurately adhere to `tokenRadius + (30 / 5) * gridSize`.
  - Accelerated animation playback rate to `1.35x` (`applySnappyPlayback`) and optimized CSS drop-shadow filters from heavy 16px/12px to lightweight 4px.
- **Impact / Testing Notes**:
  - Cast or equip Aura of Life, Aura of Vitality, Twilight Sanctuary, Crusader's Mantle, and Antilife Shell.
  - Verify crisp circular perimeter outline in theme color with animation neatly contained inside.
  - Verify Aura of Life and Vitality are subtle and non-blinding.
  - Verify snappy animation playback speed with zero lag.

---

### [2026-10-31] perf(vtt): harden stage pan/zoom edge cases, cache raycast visibility polygons, halt idle FX loops, and eliminate token-drag network storms
- **Commit**: `35a70a0`
- **Files Changed**:
  - `src/lib/visionEngine.ts`
  - `src/components/AnimatedMapOverlay.tsx`
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
- **Summary**:
  - Added a `WeakMap<WallSegment[], Map<string, VisibilityPolygon>>` raycast cache in `computeVisibilityPolygon` keyed by origin, radius, map dimensions, and a door-state signature (`getWallsDoorSignature`), so stationary tokens and torches reuse cached visibility polygons in $O(1)$ during single-token movement while immediately invalidating when doors open/close.
  - Updated `AnimatedMapOverlay` and `AnimatedFeaturesKonvaImage` to clear once, batch-draw the Konva layer once, and halt the 60 FPS `requestAnimationFrame` loop whenever no animated features or weather are active.
  - Guarded `stagePosRef` and `stageScaleRef` against mid-drag React re-render snap-backs, synced `stagePos` on programmatic `stopDrag()` and 2-finger pinch-to-zoom, and dismissed floating context menus on stage drag start.
  - Prevented full-array `SYNC_TOKENS` broadcasts during token drags (`if (isDraggingTokenRef.current) return;`), added multi-token `MOVE_TOKEN` streaming, fixed stale `tokens` / `selectedTokenIds` closures inside memoized `TokenImage` callbacks via refs, and added a global `pointerup`/`blur` drag failsafe.
  - Deduplicated `/api/ddb/monitor-characters` HTTP POST calls by sorted character ID set (`lastRegisteredDdbIdsRef`) with automatic re-registration on Socket.IO reconnect, fixed an uncancelled 150ms broadcast timer in `App.tsx`, stabilized `beforeunload` listeners, and memoized `visibleTokens` in `PlayerView.tsx`.
- **Impact / Testing Notes**:
  - Drag single and multiple selected tokens across maps with walls/doors and verify 60+ FPS movement with zero `SYNC_TOKENS` or `/api/ddb/monitor-characters` network storms.
  - Open/close doors and verify line-of-sight updates immediately.
  - Pan/zoom while socket events arrive and verify the camera never snaps back mid-drag.

---

### [2026-10-31] perf(bundle): lazy-load modals and arena mode, split vendor chunks, and defer 3D dice WebGL initialization to idle time
- **Commit**: `5493b6e`
- **Files Changed**:
  - `vite.config.ts`
  - `src/main.tsx`
  - `src/components/DiceTableOverlay.tsx`
  - `src/components/AlliesCompendiumModal.tsx`
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
- **Summary**:
  - Converted 15 heavy modals and standalone subsystems (`CampaignBuilderModal`, `PlayerArenaMode`, `MonsterCompendiumModal`, `CharacterCompendiumModal`, `AlliesCompendiumModal`, `DdbSyncModal`, `MapGenerator`, `DndChatbotModal`, `SettingsModal`, `SaveToCampaignModal`, `LoadCampaignModal`, `BugReportModal`, `BugReportManagerModal`, `CriticalHitsReferenceModal`, `WildShapeModal`, `PlayerStationModal`, `PlayerCharacterSelectModal`, `PlayerDdbPrivacyModal`) to `React.lazy` chunks and conditionally rendered them only when open (`isOpen`), eliminating background hook execution and duplicate Firestore/image loads while closed.
  - Reduced `App.js` bundle size by 41.5% (1,445 kB -> 846 kB) and the shared core chunk by 41% (2,569 kB -> 1,517 kB), and isolated `vendor-three-dice` and `vendor-arena-ai` in `vite.config.ts`.
  - Deferred `ThreeDiceEngine` WebGL shadow-map, polyhedral Cannon.js hull, and 2048x2048 texture atlas generation to `requestIdleCallback` (with immediate on-demand initialization if a roll fires early), and guarded `setTheme` with value comparison so atlases aren't regenerated unnecessarily.
  - Wrapped the revealed app view in its own inner `<Suspense>` in `src/main.tsx` and scheduled bundle warmup via `requestIdleCallback` so `IntroScreen` never unmounts or stutters on frame 0.
- **Impact / Testing Notes**:
  - Verify fast initial page load and smooth `IntroScreen` launch.
  - Open Campaign Manager, Battle Arena, Monster/Character/Allies Compendiums, D&D Beyond Sync, and Settings modals to confirm instant lazy mounting.
  - Roll 3D dice and verify smooth physics roll and theme colors.

---

### [2026-10-31] fix(diagnostics): resolve strict TypeScript errors and latent ReferenceErrors in Arena scene import & custom save
- **Commit**: `0304572`
- **Files Changed**:
  - `src/components/ArenaManagerPanel.tsx`
  - `src/components/PlayerArenaMode.tsx`
  - `src/components/DiceTableOverlay.tsx`
  - `src/main.tsx`
- **Summary**:
  - Fixed a latent runtime `ReferenceError: gridSize is not defined` in `ArenaManagerPanel.tsx` when importing a campaign scene into the Arena (`handleImportSceneIntoArena`) by accepting `sceneGridSize?: number` and passing `scene.gridSize`.
  - Fixed a latent runtime `ReferenceError: goldHeroes is not defined` and missing required `avatarUrl` property on `SceneToken` in `PlayerArenaMode.tsx` (`handleSaveCustomArena`) when saving a custom Arena configuration from the lobby before match start.
  - Fixed TypeScript `TS18048` (`'window' is possibly 'undefined'`) narrowing in `requestIdleCallback` fallback branches in `DiceTableOverlay.tsx` and `main.tsx`, bringing `npm run lint` (`tsc --noEmit`) to 0 errors across the entire project.
- **Impact / Testing Notes**:
  - Run `npm run lint` (`tsc --noEmit`) and verify 0 errors.
  - Import a campaign scene into the Arena in `ArenaManagerPanel` and save a custom Arena setup from the lobby in `PlayerArenaMode`.

---

### [2026-10-31] fix(e2e): fix target.closest TypeError, Firestore onSnapshot error fallback, roomAnnotations partial sync, and IntroScreen video preload contention
- **Commit**: `e64d8c7`
- **Files Changed**:
  - `server.ts`
  - `src/App.tsx`
  - `src/components/IntroScreen.tsx`
  - `src/lib/firebase.ts`
  - `src/main.tsx`
- **Summary**:
  - Guarded `target.closest(...)` calls in `src/App.tsx` with `typeof target.closest === 'function'` so `keydown` and `mousedown` events dispatched on `window` or `document` never throw `TypeError: target.closest is not a function`.
  - Updated `handleFirestoreError` and `subscribeToAllies` in `src/lib/firebase.ts` so read/subscription errors gracefully invoke `callback([])` (falling back to `DEFAULT_ALLIES`) instead of throwing an uncaught exception inside asynchronous `onSnapshot` handlers.
  - Added `Array.isArray(state.roomAnnotations)` and weather/grid properties to `isPartialPatch` in `server.ts` (`SYNC_STATE`), and added `fogResetKey` to `resetFog()` in `src/App.tsx`, so partial `roomAnnotations` sync packets and fog resets are never dropped by the server's blank-state guard.
  - Converted the top-level `import { createServer } from "vite"` in `server.ts` to a dev-only dynamic import (`if (process.env.NODE_ENV !== "production")`), eliminating unnecessary Vite compiler loading on production server startup.
  - Statically imported `IntroScreen` in `src/main.tsx` to eliminate the initial Suspense waterfall, and deferred `IntroScreen.tsx` portal video metadata warmup (`12.87 MB` across 7 WebM files) until after core JS bundles load so browser HTTP connections are never saturated on frame 0.
- **Impact / Testing Notes**:
  - Verified with 49/49 passing checks in the automated Headless Chrome real-browser E2E + Backend HTTP + Multi-Client Socket.IO + Vision Engine test suite (0 uncaught exceptions, 0 console errors).

---

### [2026-11-01] feat(mobile): fix DashboardHomeHub sidebar/top clipping, clamp mobile flyouts, and add DM touch pinch-zoom & long-press
- **Commit**: `e7d49de`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/DashboardHomeHub.tsx`
  - `src/components/IntroScreen.tsx`
  - `src/components/LeftSidebar.tsx`
- **Summary**:
  - Fixed mobile/tablet left-edge and top clipping on `DashboardHomeHub` (`left-16 xl:inset-0` and removing `justify-center` on the scroll container while preserving `my-auto` vertical centering on desktop).
  - Updated `LeftSidebar` for mobile (`max-md:overflow-y-auto`, touch-device hover guard via `matchMedia('(hover: none)')`, and `max-sm:` viewport clamping on flyout drawers so Pin/Close buttons never overflow narrow phone screens).
  - Added 2-finger pinch-to-zoom & pan, 1-finger touch tool forwarding, and `480ms` long-press token context menu support to the DM Konva `<Stage>` and `TokenImage` in `src/App.tsx`, plus `100dvh` viewport height and mobile clamping for floating toolbars.
  - Preserved the desktop (`>= 768px` / `>= 1280px`) layout and mouse/hover interactions 100% unchanged.
- **Impact / Testing Notes**:
  - Verify on mobile portrait (`~390x844`) that `DashboardHomeHub` is neither covered on the left by `LeftSidebar` nor clipped at the top, and verify desktop layout remains identical.

---

### [2026-11-01] fix(touch): overhaul 2-finger pinch-to-zoom with capture-phase interception, anchored math, and zero mid-pinch re-renders
- **Commit**: `18dd18d`
- **Files Changed**:
  - `src/App.tsx`
  - `src/components/PlayerView.tsx`
- **Summary**:
  - Attached native capture-phase (`{ capture: true, passive: false }`) multi-touch listeners directly on the Konva Stage container in both `src/App.tsx` (DM View) and `src/components/PlayerView.tsx` (Player View) so `Konva.DD` 1-finger drag and child token bubble cancellation never fight 2-finger pinch gestures.
  - Replaced incremental per-frame delta math with container-relative anchored world-point math (`newPos = center - startWorldPoint * newScale`), eliminating cumulative drift and the `64px` sidebar coordinate offset.
  - Eliminated mid-pinch React state updates (`setStageScale` / `setStagePos`), driving the Konva stage and DOM FX overlays imperatively at 60fps during the pinch and committing React state once when all fingers lift.
  - Added trailing single-finger release absorption (`2 -> 1 -> 0` fingers) so lifting one finger slightly before the other never causes the map to jump, and enabled smooth 1-finger touch pan on empty map in DM View when `tool === 'select' || tool === 'pan'`.
- **Impact / Testing Notes**:
  - Test 2-finger pinch-to-zoom and pan on mobile/tablet touchscreens in both DM View and Player View.

---

### [2026-11-01] fix(heroes): restore Noctua in player selection and eliminate character ID collision with Brannoc
- **Commit**: `651193c`
- **Files Changed**:
  - `src/data/defaultCharacters.ts`
  - `src/App.tsx`
  - `src/hooks/useHazardZoneTrigger.ts`
- **Summary**:
  - Removed erroneous `ddbCharacterId: 147334187` from `char_brannoc` in `src/data/defaultCharacters.ts`, which was previously colliding with and causing `isDdbMatch` to drop Noctua Shadowclaw (`147334187`) as a duplicate during Player Character Select modal list building.
  - Added explicit `ddbCampaignId: '6738033'`, `ddbCampaignTitle: 'Keys from the Golden Vault'`, and `playerName: 'Player'` to `char_noctua` for immediate primary campaign grouping and auto-expansion in Player View.
  - Added a safety check in `isDdbMatch` to prevent two completely distinct, conflicting character names from being merged by ID alone.
  - Verified compilation and availability of all campaign characters.
- **Impact / Testing Notes**:
  - Open Player View -> "Choose Your Adventurer" or click the character switch button.
  - Verify "Noctua Shadowclaw" (Owlin Ranger 5 / Rogue 2, HP 58, AC 17) is immediately visible under the "Keys from the Golden Vault" active campaign section, can be searched, and can be claimed to unlock the D&D Beyond HUD.

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
