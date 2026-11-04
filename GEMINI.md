# MistWalker Project Guidelines & Production Architecture

## Production Architecture (Stable v1.0.0)

MistWalker operates as a single-target, high-reliability live production cloud service:

- **Branch**: `v1-stable`
- **Live URL**: `https://mistwalker.onrender.com/`
- **Render Service ID**: `srv-db93bu3bc2fs73cn795g`
- **Audience**: Active DMs and players currently using MistWalker for their live campaigns.

> [!NOTE]
> The Enterprise Beta multi-tenant edition (`enterprise-multi-dm`) and its cloud service (`srv-dbhqc7afngtc73cau1i0`) have been decommissioned and archived. All history is permanently preserved in the Git tag `archive/enterprise-beta-snapshot` and `docs/archive/PENDING_ENTERPRISE_PATCHES_ARCHIVE.md`.

---

## Production Deployment Workflow

1. **Active Branch**: All work is performed on `v1-stable`.
2. **Build Verification**: Compile with `npm run build` (via `cmd.exe /c "npm run build"`) to verify zero TypeScript or bundling errors.
3. **Commit & Push**: Commit changes to `v1-stable` and push to `origin/v1-stable`.
4. **Deploy to Render**: Deploy directly to Production: `node scripts/deploy.js --prod`.
5. **Live Health Check**: Confirm `https://mistwalker.onrender.com/` returns HTTP 200.
