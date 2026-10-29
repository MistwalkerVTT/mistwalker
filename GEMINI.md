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

## Mandatory Auto-Sync Rule (Stable -> Enterprise)
- **Every bug fix, adjustment, or change made to `v1-stable` MUST immediately and automatically be merged into `enterprise-multi-dm`** so the enterprise version never falls behind on stable fixes.
- **Workflow**:
  1. Test compilation (`npm run build`).
  2. Commit to `v1-stable` and push to `origin/v1-stable`.
  3. Checkout `enterprise-multi-dm`, merge `v1-stable` (`git merge v1-stable`), and push to `origin/enterprise-multi-dm`.
  4. Script helper: `node scripts/sync-and-deploy.cjs` or `node scripts/deploy.js`.
  5. Verify both live endpoints are healthy (HTTP 200).
