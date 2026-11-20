---
name: stable-deploy-patch
description: Automates the MistWalker v3.1 test-lab deployment workflow. Verifies compilation (npm run build), pushes to origin/v3.1, triggers the Render test-lab deploy, and verifies live health. Never deploys to Railway (production) unless the user explicitly says so.
---

# MistWalker Test Lab Deploy Skill (v3.1)

Use after completing any change on `v3.1`. Render (`https://mistwalker.onrender.com/`) is the **test lab**. Railway is **production** and is OFF-LIMITS unless the user explicitly orders a production release.

## Pre-checks
1. `git branch --show-current` must be `v3.1`.
2. Keep unrelated uncommitted working files intact.

## Steps

### 1. Build
```sh
cmd.exe /c "npm run build"
```
> [!IMPORTANT]
> On any failure, halt. Do not push broken code.

### 2. Push
```sh
git push origin v3.1
```

### 3. Deploy to Render test lab (`srv-db93bu3bc2fs73cn795g`)
```sh
node scripts/deploy.js --prod
```

### 4. Health check
```sh
curl -I https://mistwalker.onrender.com/
```
Expect HTTP 200.

> [!CAUTION]
> Do NOT push `railway-prod` or run any Railway deploy from this skill.
