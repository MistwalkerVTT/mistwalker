---
name: stable-deploy-patch
description: Automates the MistWalker production deployment workflow on v1-stable. Verifies compilation (npm run build), pushes to origin/v1-stable, triggers Render production deploy, and verifies live health.
---

# MistWalker Production Deploy Skill

Use this skill when completing a feature, bugfix, or tactical optimization on `v1-stable` and preparing it for production release on Render.

## Pre-requisites & Rules Check
1. Ensure the active Git branch is `v1-stable`:
   ```sh
   git branch --show-current
   ```
2. Verify that there are no uncommitted syntax errors.
3. Keep unrelated uncommitted working files intact.

---

## Step-by-Step Execution Workflow

### Step 1: Build Verification
Run project compilation using `cmd.exe` to respect Windows execution policies:
```sh
cmd.exe /c "npm run build"
```
> [!IMPORTANT]
> If compilation fails with TypeScript errors or bundle errors, halt immediately. Do not push broken code to production.

### Step 2: Push Commit to `v1-stable`
Push the approved and tested commit to the remote production tracking branch:
```sh
cmd.exe /c "set \"PATH=%LOCALAPPDATA%\\Microsoft\\WinGet\\Links;%PATH%\" && git push origin v1-stable"
```

### Step 3: Trigger Render Production Deploy
Trigger the cloud deployment to Render Production Service (`srv-db93bu3bc2fs73cn795g`):
```sh
node scripts/deploy.js --prod
```
The deploy script monitors the deployment until status is `live`.

### Step 4: Verify Live Health
Perform a final HTTP GET verification against the live production endpoint:
```sh
curl -I https://mistwalker.onrender.com/
```
Confirm the server responds with `HTTP/2 200` or `HTTP/1.1 200`.
