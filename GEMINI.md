# MistWalker Project Guidelines & Auto-Upload Rule

## Mandatory Automatic Online Platform Sync & Live Deployment
For every conversation and task in this project:
- At the end of every request or milestone when files are modified, created, or deleted:
  1. Always build or test the code to ensure clean compilation (`npm run build`).
  2. Automatically stage and commit all project changes using Git (`C:\Users\Scott\AppData\Local\Microsoft\WinGet\Links\git.exe` or `git`).
  3. Automatically push the commit to our online platform repository: `origin/main` (`https://github.com/MistwalkerVTT/mistwalker.git`).
  4. Always verify that the push succeeded and record the latest commit hash.
  5. **Mandatory Live Cloud Deploy**: Trigger Render deployment and verify live status using `npm run deploy` (or `node scripts/deploy.js`).
  6. Always verify that the live endpoint (`https://mistwalker.onrender.com/`) is healthy (HTTP 200) and report the latest commit hash, deploy ID, and live URL to the user.

## Render Deployment Details
- **Service ID**: `srv-db93bu3bc2fs73cn795g`
- **Live URL**: `https://mistwalker.onrender.com/`
- **Trigger Command**: `npm run deploy`
