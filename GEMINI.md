# MistWalker Project Guidelines & Architecture (v3.1)

## Environments

| Role | Platform | URL / Service | When |
|------|----------|---------------|------|
| **Test Lab** | Render | `https://mistwalker.onrender.com/` (`srv-db93bu3bc2fs73cn795g`) | Every update, automatically |
| **Production** | Railway | Railway project (`railway-prod`) | **ONLY when the user explicitly says so** |

- **Active Branch**: `v3.1` (branched from `railway-prod`). All work is performed on `v3.1`.

> [!NOTE]
> The Enterprise Beta multi-tenant edition (`enterprise-multi-dm`) and its cloud service (`srv-dbhqc7afngtc73cau1i0`) have been decommissioned and archived. History is preserved in Git tag `archive/enterprise-beta-snapshot` and `docs/archive/PENDING_ENTERPRISE_PATCHES_ARCHIVE.md`.

---

## Test Lab Deployment Workflow (Mandatory Rule)

**Rule**: Every update/change MUST be committed to `v3.1`, pushed to `origin/v3.1`, and deployed to the Render test lab (`https://mistwalker.onrender.com/`) automatically after build verification. Do not leave verified updates local-only.

1. **Active Branch**: `v3.1`.
2. **Build Verification**: `cmd.exe /c "npm run build"` must succeed with zero TypeScript or bundling errors.
3. **Commit & Push**: Commit to `v3.1` and push to `origin/v3.1`.
4. **Deploy to Render (Test Lab)**: `node scripts/deploy.js --prod` (targets the Render service, which is now the test lab).
5. **Health Check**: Confirm `https://mistwalker.onrender.com/` returns HTTP 200.

---

## Railway Production Rule (Mandatory)

**NEVER deploy to Railway, push to `railway-prod`, or trigger any Railway deployment/redeploy unless the user explicitly instructs it in that moment.** Passing tests on Render is not permission. When the user says to release, merge/push the approved `v3.1` state to production on Railway and verify health.
