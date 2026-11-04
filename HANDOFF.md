# MistWalker 3.0: Project Handoff & Architecture Source of Truth

## 1. Project Overview & Production Target
MistWalker is a live, full-stack D&D 5e virtual tabletop (VTT) and campaign management tool.

- **Production Branch**: `v1-stable`
- **Live Endpoint**: `https://mistwalker.onrender.com/` (Render Service ID: `srv-db93bu3bc2fs73cn795g`)
- **Primary Tech Stack**:
  - **Frontend**: React 18 SPA (Vite), Tailwind CSS, `react-konva` for 2D canvas, Three.js for 3D dice.
  - **Backend / API**: Node.js Express server (`server.ts`, bundled to `dist/server.cjs`).
  - **Database & Sync**: Google Firebase Firestore (`firestore.rules`, `src/lib/firebase.ts`).
  - **AI Integration**: Google Gemini API via secure server-side proxies and AI Studio integration.

> [!NOTE]
> The Enterprise Beta multi-tenant track (`enterprise-multi-dm`) and its cloud service (`srv-dbhqc7afngtc73cau1i0`) have been decommissioned and suspended. All history is permanently preserved in Git tag `archive/enterprise-beta-snapshot` and `docs/archive/PENDING_ENTERPRISE_PATCHES_ARCHIVE.md`.

---

## 2. Directory Layout & Modularized Subsystems

```
Mistwalker 3.0/
├── .agents/                    # Antigravity Agent Configuration
│   ├── rules/                  # Project rules (production-workflow.md, subagent-protocols.md)
│   └── skills/                 # Custom skills (stable-deploy-patch)
├── docs/                       # Project documentation & archives
│   └── archive/                # Archived patch queues & historical snapshots
├── scripts/                    # Operational automation (deploy.js, audio/sfx scrapers)
├── server/                     # Node.js Express server endpoints
└── src/
    ├── components/
    │   ├── canvas/             # Dedicated Konva rendering subcomponents (GifImage.tsx, etc.)
    │   └── sidebar/            # Modular flyout and tab panels (DiceFlyoutPanel.tsx, etc.)
    ├── data/                   # Catalogs & presets (defaultTokens.ts, presetBattlemaps.ts, etc.)
    ├── effects/                # Animated spells, sequences, and JB2A video effects
    ├── graphics/               # 3D Three.js dice physics and textures
    ├── hooks/                  # Domain custom hooks (useTacticalGrid.ts, etc.)
    ├── lib/                    # Canvas math (canvasTransforms.ts) and Firebase adapters
    ├── services/               # Universal VTT (.dd2vtt), audio narration, Monster HUD
    └── types/                  # TypeScript data interfaces
```

---

## 3. Recently Modularized Modules
- **`src/hooks/useTacticalGrid.ts`**: Encapsulates `gridSize`, `gridOffsetX`, `gridOffsetY`, `gridVisible`, and interactive box-tracing calibration math (`startGridCalibration`, `updateGridCalibration`, `finishGridCalibration`).
- **`src/components/canvas/GifImage.tsx`**: Isolated, reusable animated GIF and canvas frame renderer for Konva canvas, deduplicated between DM view (`App.tsx`) and player view (`PlayerView.tsx`).
- **`src/components/sidebar/DiceFlyoutPanel.tsx`**: Dedicated component for the 3D dice roller flyout and roll history.
- **`src/data/defaultTokens.ts`**: Single source of truth for standard character/monster token catalogs and 5e status conditions.
- **`src/lib/canvasTransforms.ts`**: Pure mathematical utility for Konva rotation and coordinate translation.

---

## 4. Conversation & Subagent Protocols
1. **Single-Responsibility Threads**: Keep chat sessions focused on one feature, bugfix, or modularization pass.
2. **Context Pruning**: Use `/compact` whenever conversations transition from debugging to release/testing.
3. **Subagent Delegation**:
   - Use the read-only `research` subagent for broad codebase searches and grep checks.
   - Use `Workspace: 'branch'` when launching subagents for code refactoring to keep your active workspace isolated.
   - Route all `firestore.rules` modifications to `firestore-rules-author`.
4. **Production Deploy Workflow**:
   - Verify build: `cmd.exe /c "npm run build"`.
   - Push commit to `v1-stable`.
   - Run `/stable-deploy-patch` or `node scripts/deploy.js --prod`.
