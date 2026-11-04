# Step 3 Implementation Plan: Safe Modularization of High-Traffic Monoliths

## Context & Problem Analysis
- **[src/App.tsx](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/src/App.tsx)** has grown to **14,210 lines**.
- **[src/components/LeftSidebar.tsx](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/src/components/LeftSidebar.tsx)** has grown to **5,119 lines**.
- Large files cause massive token consumption, slow tool execution, and high risk of merge collisions during rapid development.

---

## Safety-First Refactoring Philosophy: "Never Break the Board"
To honor the directive **"Try not to break the app"**, refactoring must follow strict safety invariants:
1. **Incremental & Atomic**: No sweeping multi-file rewrites in a single turn. Each extraction is isolated.
2. **Strict Verification Gate**: Run `cmd.exe /c "npm run build"` after every extraction. If Vite or TypeScript reports any error or warning regression, we immediately halt and fix or revert.
3. **Behavioral Invariance**: No business logic, styling, or interface contracts will be changed—only file structure.

---

## Phased Modularization Roadmap

```mermaid
flowchart TD
    subgraph Phase 3A: Static Constants & Utilities
        A1["Extract constants to src/constants/tokens.ts"]
        A2["Extract pure utils to src/utils/canvasTransforms.ts"]
    end

    subgraph Phase 3B: Canvas Subcomponents
        B1["Extract TokenImage to src/components/canvas/TokenImage.tsx"]
        B2["Extract GifImage to src/components/canvas/GifImage.tsx"]
    end

    subgraph Phase 3C: Sidebar Subtabs
        C1["Extract Maps Tab to src/components/sidebar/MapsSidebarTab.tsx"]
        C2["Extract Tactical FX to src/components/sidebar/FxSidebarTab.tsx"]
        C3["Extract Lighting/Walls to src/components/sidebar/TacticalLayersTab.tsx"]
    end

    subgraph Phase 3D: Tactical Hooks
        D1["Extract useTacticalGrid.ts from App.tsx"]
    end

    Phase 3A -->|Build Gate| Phase 3B
    Phase 3B -->|Build Gate| Phase 3C
    Phase 3C -->|Build Gate| Phase 3D
```

---

### Phase 3A: Static Constants & Utilities (Lowest Risk)
Extract static dictionaries and helper calculations that currently live inside [src/App.tsx](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/src/App.tsx):
1. **`src/constants/tokens.ts`**:
   - `AVAILABLE_TOKENS`: Curated default token catalog.
   - `CONDITIONS` & `DND_CONDITIONS`: 5e condition identifiers, badges, and labels.
   - `VOICES`: Narration voice lists.
2. **`src/utils/tokenImageTransforms.ts`**:
   - `getImageTransform`: Math for rotation, width, and height scaling.

*Verification Gate*: Import newly created constants back into `App.tsx` and run `npm run build`.

---

### Phase 3B: Isolated Canvas Subcomponents (Low Risk)
Subcomponents defined directly in [src/App.tsx](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/src/App.tsx) prior to the `App` component definition:
1. **`src/components/canvas/TokenImage.tsx`**:
   - Handles Konva token rendering, health bars, conditions, elevation, selection ring, and image caching.
2. **`src/components/canvas/GifImage.tsx`**:
   - Handles animated gif frames on the Konva canvas.

*Verification Gate*: Replace inline component declarations in `App.tsx` with modular imports; run `npm run build`.

---

### Phase 3C: Deconstruct `LeftSidebar.tsx` Subtabs (Medium Risk)
[src/components/LeftSidebar.tsx](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/src/components/LeftSidebar.tsx) (5,119 lines) contains multiple self-contained UI views:
1. **`src/components/sidebar/MapsSidebarTab.tsx`**:
   - Session Maps vs. Map Library, Preset Gallery, and VTT Repository launcher.
2. **`src/components/sidebar/FxSidebarTab.tsx`**:
   - Tactical features, animated weather overlays, and map scale controls.
3. **`src/components/sidebar/DdbPartyTokensTab.tsx`**:
   - D&D Beyond sync status, party token dock, and character importing.

*Verification Gate*: Pass props cleanly from `LeftSidebar.tsx` to each tab; run `npm run build`.

---

### Phase 3D: Extract Custom Tactical Hooks from `App.tsx` (Targeted)
1. **`src/hooks/useTacticalGrid.ts`**:
   - `gridSize`, `gridOffsetX`, `gridOffsetY`, `isGridVisible`, `gridColor`.
   - Box calibration calculation math (`calibrateByBox`).
   - Clean setter interface (`setGridSize`, `setGridOffsetX`, etc.).

*Verification Gate*: Wire hook into `App.tsx`; run `npm run build`.

---

## Action Plan for User Approval
We recommend executing **Phase 3A (Static Constants & Utilities)** first. It removes ~400 lines of boilerplate from `App.tsx` with zero risk of breaking any UI or React lifecycle.
