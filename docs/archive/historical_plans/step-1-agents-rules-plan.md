# Step 1 Implementation Plan: Agent Rules Setup (`.agents/rules/`)

## Objective
Establish structured Antigravity project rules in `<project-root>/.agents/rules/` to enforce clean conversation separation, dual-domain branch safety (`v1-stable` vs. `enterprise-multi-dm`), context pruning, and subagent workspace isolation.

---

## Zero-Risk Safety Guarantees
- **No Runtime Code Touched**: Files created will be strictly markdown (`.md`) inside `.agents/rules/`. No source files (`src/`, `server.ts`, `package.json`, etc.) or existing uncommitted changes will be modified.
- **Build Integrity**: We will run `npm run build` to verify that the build pipeline is completely unaffected.
- **Git State**: Your active uncommitted edits in `src/components/PlayerArenaMode.tsx` and `src/data/presetBattlemaps.ts` remain untouched.

---

## Detailed File Specifications

### 1. `.agents/rules/dual-domain-hygiene.md`
Enforces conversational and branch isolation rules across all future agent interactions:
- **Conversation Threading by Branch**:
  - `[Stable]` Threads: Only for bugfixes, tactical board polish, and DM tools on `v1-stable`.
  - `[Enterprise]` Threads: Only for multi-tenant lobbies, room codes, and enterprise development on `enterprise-multi-dm`.
  - `[Batch Sync]` Threads: Only for synchronizing batched changes from `PENDING_ENTERPRISE_PATCHES.md` into `enterprise-multi-dm`.
- **Context Compaction Trigger**:
  - Mandates calling `/compact` when transitioning between debugging and deployment to keep token windows lean.
- **Context Attachment Best Practice**:
  - Directs agents and user to reference previous threads with `@` mentions or link file paths instead of copying raw paste dumps.
- **Dual-Domain Deployment Safeguard**:
  - Re-anchors the policy that automatic pushing from `v1-stable` to `enterprise-multi-dm` is paused, and every stable change must be logged in `PENDING_ENTERPRISE_PATCHES.md`.

### 2. `.agents/rules/subagent-protocols.md`
Establishes subagent behavior and isolation standards:
- **Read-Heavy Research Delegation**:
  - Requires codebase-wide searches, multi-file inspection, and documentation lookups to be delegated to the read-only `research` subagent to prevent context pollution in the primary conversation.
- **Workspace Isolation for Edits**:
  - Mandates setting `Workspace: 'branch'` whenever spinning up subagents for refactoring or speculative code generation, ensuring subagents work in an isolated Git worktree without touching active working files.
- **Specialist Subagent Routing**:
  - Mandates routing any Cloud Firestore security rule changes to `firestore-rules-author`.
- **Lifecycle Cleanup**:
  - Instructs agents to terminate idle subagents promptly after task completion.

---

## Verification Steps
1. Create directory `.agents/rules/` and write both rule files.
2. Verify files exist and have valid markdown formatting.
3. Run `npm run build` to confirm zero side effects on Vite / TypeScript compilation.
