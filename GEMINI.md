# MistWalker Project Guidelines & Dual-Domain Deployment Rule

## Dual-Domain Architecture (Stable vs. Enterprise Beta)

MistWalker operates on **two distinct, isolated live cloud services and domains**:

1. **Production (Stable v1.0.0)**
   - **Branch**: `v1-stable`
   - **Live URL**: `https://mistwalker.onrender.com/`
   - **Render Service ID**: `srv-db93bu3bc2fs73cn795g`
   - **Audience**: Active DMs and players currently using MistWalker for their live campaigns.

2. **Enterprise Beta (Multi-Tenant Commercial Multi-DM)**
   - **Branch**: `enterprise-multi-dm`
   - **Live URL**: `https://mistwalker-beta.onrender.com/`
   - **Render Service ID**: `srv-dbhqc7afngtc73cau1i0`
   - **Audience**: Commercial development, multi-DM testing, room codes, lobbies, and user accounts.

---

## Deployment & Patch Policy (Auto-Push to Enterprise is PAUSED)

- **Automatic pushing of stable updates into enterprise mode is PAUSED.**
- **Stable Deployment Workflow**:
  1. Make fixes/features on `v1-stable`.
  2. Test compilation (`npm run build`).
  3. Commit to `v1-stable` and push to `origin/v1-stable`.
  4. Deploy to Production only: `node scripts/deploy.js --prod`.
  5. Verify live production endpoint is healthy (HTTP 200).
- **Tracking Stable Changes for Enterprise**:
  - Every change made to `v1-stable` MUST be logged in `PENDING_ENTERPRISE_PATCHES.md`.
  - Record the commit hash, date, affected files, and a concise summary.
- **Enterprise Release Patches**:
  - Pending stable updates will be batched and merged into `enterprise-multi-dm` only when explicitly requested by the user.
