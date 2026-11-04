# DM Monster Tactical HUD — Detailed Engineering Roadmap

## Executive Summary
The **DM Monster Tactical HUD** provides the Dungeon Master with an interactive bottom command dock whenever a monster token is clicked or targeted in DM View (`src/App.tsx`). Similar to the Player HUD, it transforms static text stat blocks into clickable 1-tap actions equipped with 3D physics dice rolls, JB2A spell & weapon visual effects, automated targeting against player tokens, and dynamic tracking for **Recharge (5–6)**, **Legendary Action Points**, and **Spell Slots**.

---

## Architecture Overview

```
                               ┌──────────────────────────────────────────────────────────┐
                               │                    DM View (App.tsx)                     │
                               │           Single Monster Token Clicked on Map            │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                               ┌────────────────────────────▼─────────────────────────────┐
                               │            Monster Action Normalization Engine           │
                               │               (src/services/monsterHudService.ts)         │
                               ├──────────────────────────────────────────────────────────┤
                               │ • Regex & AST Parsing (Hit bonuses, multi-damage, DC)    │
                               │ • Spellcasting Block Decomposition (At-will, slots, DC)  │
                               │ • Spell Catalog & JB2A Registry Cross-Referencing        │
                               │ • Multiattack Routine Structuring                        │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                               ┌────────────────────────────▼─────────────────────────────┐
                               │         Per-Token Transient State Layer (Token.ts)       │
                               ├──────────────────────────────────────────────────────────┤
                               │ • Instance-specific HP, Temp HP & Conditions             │
                               │ • Recharge availability (e.g., Fire Breath: Ready / Used)│
                               │ • Expended Spell Slots per level (1st-9th)               │
                               │ • Legendary Action points remaining (3/3 -> 1/3)         │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                               ┌────────────────────────────▼─────────────────────────────┐
                               │             DM Monster Tactical Dock Component           │
                               │              (src/components/DmMonsterDock.tsx)          │
                               ├──────────────────────────────────────────────────────────┤
                               │ [Header] Identity, Quick-HP (-5/+5), AC, Speed, PP, CR   │
                               │ [Tabs]   Attacks | Actions | Spells | React | Legendary  │
                               │ [Cards]  Rollable 1-tap actions with DC/Dmg/Hit badges   │
                               │ [Footer] Legendary Action Pips, Recharge Roller, Traits  │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │
                               ┌────────────────────────────▼─────────────────────────────┐
                               │         Targeting, 3D Physics Dice & Socket Sync         │
                               ├──────────────────────────────────────────────────────────┤
                               │ • Click action -> Aim reticle on battlemap               │
                               │ • Click player token -> 3D dice roll on all screens      │
                               │ • JB2A Video overlay spawn (breath, bite, spell)         │
                               │ • Socket: REQUEST_TOKEN_MUTATION to update Player HP     │
                               └──────────────────────────────────────────────────────────┘
```

---

## Phase Breakdown & Milestone Schedule

### Phase 1: Action & Spell Normalization Engine
**Target Files:**
- `src/services/monsterHudService.ts` (New)
- `src/types/monsterHud.ts` (New)
- `src/data/srdSpellsCatalog.ts` (New lightweight spell catalog for monster spell lookups)

#### Objectives
1. **Unified Monster Data Model (`src/types/monsterHud.ts`)**:
   - Define `DmMonsterHudData`:
     ```ts
     export interface DmMonsterHudData {
       tokenId: string;
       monsterId?: string;
       name: string;
       size: string;
       type: string;
       alignment: string;
       cr: string;
       xp: number;
       ac: number;
       acNotes?: string;
       currentHp: number;
       maxHp: number;
       tempHp: number;
       speed: string;
       initiativeBonus: number;
       passivePerception: number;
       spellSaveDc?: number;
       spellAttackBonus?: number;
       stats: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
       savingThrows?: string;
       damageResistances?: string;
       damageImmunities?: string;
       conditionImmunities?: string;
       senses?: string;
       attacks: HudActionItem[];
       actions: HudActionItem[];
       bonusActions: HudActionItem[];
       reactions: HudActionItem[];
       legendaryActions: HudActionItem[];
       legendaryMaxPoints: number;
       spells: HudActionItem[];
       traits: Array<{ name: string; description: string }>;
       multiattackRoutine?: string[];
     }
     ```

2. **Regex & AST Extraction Rules**:
   - **Attack Bonus**: `/(?:Melee|Ranged)\s+(?:Weapon|Spell)\s+Attack:\s*\+?(-?\d+)\s+to\s+hit/i`
   - **Reach & Range**: `/(?:reach|range)\s+([0-9/]+\s*(?:ft\.?|feet))/i`
   - **Multi-Component Damage**:
     Extracts both primary and secondary damage:
     `"Hit: 17 (2d10 + 6) piercing damage plus 7 (2d6) fire damage"`
     $\rightarrow$ Primary: `2d10+6` piercing, Secondary: `2d6` fire $\rightarrow$ combined display `2d10+6 + 2d6`.
   - **Saving Throw DCs**:
     `/DC\s*(\d+)\s*(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma|STR|DEX|CON|INT|WIS|CHA)/i`
   - **Recharge Extraction**:
     `/\(Recharge\s*([0-9–-]+)\)/i` $\rightarrow$ marks ability with `rechargeType: '5-6'` and registers a dice trigger.

3. **Spellcasting Block Decomposer**:
   - Scan monster traits for `Spellcasting` or `Innate Spellcasting`.
   - Extract casting ability, spell save DC, and attack bonus.
   - Parse spell frequencies:
     - `Cantrips (at will): ...`
     - `1st level (4 slots): ...`
     - `3/day each: ...`
     - `1/day: ...`
   - Cross-reference extracted spell names with standard SRD spell profiles to obtain formula, save DC, school, and `JB2A_REGISTRY` asset keys.

---

### Phase 2: Per-Token Instance State Architecture
**Target Files:**
- `src/types/index.ts` (Update `Token` interface)
- `src/App.tsx` (Token state management and update handlers)

#### Objectives
1. **Prevent Multi-Instance State Collisions**:
   If 4 Skeletons or 2 Young Dragons are on the board, expending Dragon #1's *Fire Breath* or Mage #1's *3rd-level spell slot* must not modify Dragon #2 or Mage #2.
2. **Add `monsterState` to `Token`**:
   ```ts
   export interface TokenMonsterState {
     rechargeAvailable: Record<string, boolean>; // e.g., { "Fire Breath": true }
     spellSlotsUsed: Record<number, number>;     // e.g., { 1: 2, 3: 1 }
     legendaryPointsUsed: number;                // e.g., 2
     customCounters: Record<string, number>;     // e.g., { "Innate Fly (1/day)": 1 }
   }
   ```
3. **Automated Turn-Start Recharge Cycle**:
   - In `App.tsx`, when the Combat Tracker advances or the DM begins a monster's turn:
   - Identify un-recharged abilities (`rechargeAvailable[action] === false`).
   - Automatically roll `1d6` per ability. If the roll meets or exceeds the recharge threshold (e.g. $\ge 5$), flip `rechargeAvailable[action] = true` and display a toast alert:
     > *"⚡ Young Red Dragon rolled a 5: Fire Breath recharged!"*
   - Provide an inline **"Roll Recharge"** button on the card if the DM wants to roll manually outside initiative.

---

### Phase 3: DM Monster Tactical Dock UI
**Target Files:**
- `src/components/DmMonsterDock.tsx` (New component)
- `src/components/DmMonsterDock.css` (Optional styling refinements)

#### Objectives
1. **Visual Styling**:
   - Distinctive **Crimson & Amber Command Theme** (`border-red-900/60`, `bg-zinc-950/95`, amber accents) so the DM immediately recognizes they are commanding an adversary, contrasting with the player's Emerald/Blue dock.
2. **Top Vitals & Health Management Strip**:
   - Monster portrait & token name.
   - Quick-increment HP bar:
     `[ -10 ] [ -5 ] [ -1 ]  [ 136 / 178 HP ]  [ +1 ] [ +5 ] [ +10 ]`
   - AC shield badge (with natural armor or shield notes).
   - Speed pill (walk, fly, swim, burrow).
   - Passive Perception and Senses (Darkvision, Blindsight, Truesight).
   - Damage Resistances, Immunities, and Condition Immunities pills.
3. **Tabbed Action Cards**:
   - **Attacks & Actions**:
     - Multiattack Routine pill (e.g. `Multiattack: 1 Bite + 2 Claws`).
     - Weapon & melee attack cards with `+Hit`, `Reach/Range`, `Damage Dice` badges.
   - **Spells**:
     - Spell level / Frequency filter bar (`All`, `At Will`, `1st`, `2nd`, `3rd`, etc.).
     - Clickable spell slot pips indicating remaining slots.
   - **Bonus Actions & Reactions**:
     - Goblin's *Nimble Escape*, Bandit Captain's *Parry*, Mage's *Shield*.
   - **Legendary & Lair Actions**:
     - 3 glowing purple pips (`● ● ●`).
     - Cost badges (e.g. `Wing Attack (Costs 2 Actions)`).
   - **Traits & Passives**:
     - Quick-reference cards for *Pack Tactics*, *Magic Resistance*, *Undead Fortitude*, etc.
4. **Dock Ergonomics & Map Clearance**:
   - Integrated with the DM viewport: when the DM selects 1 monster token, hide the generic `#selected-objects-floating-hud` and mount `DmMonsterDock`.
   - Collapsible down to a 34px mini-strip via `ChevronDown` or pressing key `M` so battlemap lines of sight remain completely clear.

---

### Phase 4: Battlemap Targeting, 3D Physics Dice & Player Sync
**Target Files:**
- `src/App.tsx` (Connect targeting callbacks, socket events, reticles)
- `server/server.ts` (Ensure socket relay handles DM-initiated targeting)

#### Objectives
1. **Unified Targeting Flow**:
   - DM clicks **Bite** $\rightarrow$ cursor changes to crosshair reticle with aim ray anchored to the monster token.
   - DM clicks a Player token on the map:
     1. Local calculation compares `1d20 + hitBonus` against Player's AC.
     2. Emits `SYNC_LOCAL_DICE_ROLL` with `characterName: "Young Red Dragon"`, rolling 3D dice across all player screens.
     3. Emits `EFFECT_SPAWN` with corresponding JB2A video animation (slash, bite, arrow).
     4. Emits `REQUEST_TOKEN_MUTATION` targeting player token ID with calculated damage.
2. **Cone / Line / Area Breath Weapon Reticles**:
   - Clicking **Fire Breath (30 ft. Cone)**:
     - Activates the Konva cone aim template centered on the dragon token.
     - Automatically detects which player tokens lie within the polygon/circle using `isPointInPolygon` from `src/lib/visionEngine.ts`.
     - Rolls the full damage pool in 3D physics dice (e.g. `16d6`).
     - Prompts the DM with saving throw results or applies half/full damage.
3. **Self-Action Buffs & Heals**:
   - Traits like *Regeneration* or spells like *Misty Step* execute immediately on the monster token with zero extra clicks.

---

### Phase 5: Verification, Benchmarks & Stress Testing
**Target Files:**
- `scripts/stressTest.ts`
- Automated test runs via `npm run build`

#### Objectives
1. **Catalog Parsing Stress Test**:
   - Feed all 1,500+ SRD monsters through `monsterHudService.ts`.
   - Verify 0 crashes, 0 unhandled exceptions, and 100% regex match safety.
2. **Zero-Lag Selection Benchmark**:
   - Cache normalized HUD structures in an in-memory `Map<string, DmMonsterHudData>`.
   - Benchmark token click-to-render latency: target $< 4\text{ms}$.
3. **Mandatory Live Deployment**:
   - Commit, push to `origin/main`, trigger Render deployment via `npm run deploy`, and verify live status on `https://mistwalker.onrender.com/`.

---

## File Creation & Modification Matrix

| File Path | Status | Purpose |
| :--- | :--- | :--- |
| `src/types/monsterHud.ts` | **New** | Strict types for normalized monster HUD actions, recharge states, and stat blocks. |
| `src/services/monsterHudService.ts` | **New** | Parsing engine extracting to-hit, multi-damage, DCs, spell blocks, and JB2A bindings. |
| `src/data/srdSpellsCatalog.ts` | **New** | Compact spell definitions (dice, save DC, school, range) for monster spellcaster expansion. |
| `src/components/DmMonsterDock.tsx` | **New** | The full DM Monster Tactical Bottom Dock component. |
| `src/types/index.ts` | **Modify** | Add `monsterState` to `Token` interface for per-instance recharge and slot tracking. |
| `src/App.tsx` | **Modify** | Mount `DmMonsterDock` on single monster token selection; connect targeting and 3D dice rolls. |
| `scripts/stressTest.ts` | **Modify** | Add stress testing suite for monster action parsing across all SRD creatures. |

---

## Implementation Readiness

This roadmap builds directly upon the existing `PlayerHeroDock` architecture, `JB2A_REGISTRY`, and socket communication pipelines, ensuring zero disruption to existing DM map tools, fog of war, or lighting layers.
