# Implementation Plan: Decommissioning Enterprise Beta & Streamlining to Single-Domain

## Objective
Safely sunset and archive the Enterprise Beta (`enterprise-multi-dm`), suspend its active Render cloud service (`srv-dbhqc7afngtc73cau1i0`) to stop unnecessary compute/billing overhead, and streamline the MistWalker project into a unified, high-efficiency Production pipeline centered on `v1-stable`.

---

## Strategic Benefits of Decommissioning Enterprise Now
1. **Immediate Compute & Cost Savings**: Suspending the Render beta service stops server running hours and frees cloud resources.
2. **Eliminates Context & Overhead Bloat**:
   - Removes the mandatory requirement to record every commit in [PENDING_ENTERPRISE_PATCHES.md](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/PENDING_ENTERPRISE_PATCHES.md) (~900 lines).
   - Eliminates dual-branch context switching in agent conversations.
3. **Unlocks Safe Codebase Refactoring**:
   - With the 4,465-line divergence between `v1-stable` and `enterprise-multi-dm` eliminated as a concern, you can safely modularize [src/App.tsx](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/src/App.tsx) and [src/components/LeftSidebar.tsx](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/src/components/LeftSidebar.tsx) without the fear of a massive 3-way merge conflict.

---

## 4-Step Decommissioning & Archival Roadmap

```mermaid
flowchart TD
    subgraph Step 1: Cloud & Git Safety Archive
        G1["Git Tag: archive/enterprise-beta-snapshot"]
        R1["Suspend Render Beta Service (srv-dbhqc7afngtc73cau1i0)"]
    end

    subgraph Step 2: Documentation Archival
        D1["Move PENDING_ENTERPRISE_PATCHES.md to docs/archive/"]
        D2["Clean repo root"]
    end

    subgraph Step 3: Script & Automation Pruning
        S1["Remove scripts/sync-and-deploy.cjs"]
        S2["Refactor .agents/skills/stable-deploy-patch/ to production-deploy"]
    end

    subgraph Step 4: Rule & Guideline Alignment
        U1["Update GEMINI.md to Single-Domain Production Model"]
        U2["Update .agents/rules/dual-domain-hygiene.md -> production-workflow.md"]
    end

    Step 1 --> Step 2 --> Step 3 --> Step 4
```

---

### Step 1: Cloud & Git Safety Snapshot (Zero Data Loss)
- **Tag Remote Git Branch**:
  Create an annotated Git tag on the current enterprise branch so 100% of the commercial multi-DM code is preserved permanently:
  ```sh
  git tag -a archive/enterprise-beta-snapshot origin/enterprise-multi-dm -m "Archive of enterprise-multi-dm before pausing commercial tier"
  git push origin archive/enterprise-beta-snapshot
  ```
- **Suspend Render Service**:
  Trigger the Render API to suspend `srv-dbhqc7afngtc73cau1i0` (`POST https://api.render.com/v1/services/srv-dbhqc7afngtc73cau1i0/suspend`). This stops instance compute hours immediately.

---

### Step 2: Documentation Archival
- Create `docs/archive/` and move [PENDING_ENTERPRISE_PATCHES.md](file:///g:/Scott/dnd/MistWalker/Mistwalker%203.0/PENDING_ENTERPRISE_PATCHES.md) into `docs/archive/PENDING_ENTERPRISE_PATCHES_ARCHIVE.md`.
- No longer require logging commits to an enterprise queue. You can keep an optional lightweight `CHANGELOG.md` or rely on standard Git commit history.

---

### Step 3: Script & Automation Pruning
- **Delete `scripts/sync-and-deploy.cjs`**: It is obsolete and carries the risk of accidentally attempting to merge into enterprise.
- **Update `.agents/skills/stable-deploy-patch/`**:
  - Simplify the skill to focus purely on the Production pipeline:
    1. Verify clean build (`cmd.exe /c "npm run build"`).
    2. Push `v1-stable`.
    3. Trigger production deploy (`node scripts/deploy.js --prod`).
    4. Verify live health check (`https://mistwalker.onrender.com/` returns HTTP 200).

---

### Step 4: Update Project Rules (`GEMINI.md` & `.agents/rules/`)
- **`GEMINI.md`**:
  - Replace the dual-domain deployment rule with the streamlined **Single-Domain Production Architecture** (`v1-stable` → `https://mistwalker.onrender.com/`).
- **`.agents/rules/dual-domain-hygiene.md`**:
  - Replace with `production-workflow.md`, instructing all agents to focus 100% of their attention on the live production DM experience.

---

## Verification & Rollback Safety
- **Can Enterprise be restored later?** Yes, completely. The tagged Git commit (`archive/enterprise-beta-snapshot`) and archived patch document preserve all history.
- **Production Impact**: `v1-stable` and live campaign DMs on `https://mistwalker.onrender.com/` will experience zero disruption.
