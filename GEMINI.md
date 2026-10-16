# MistWalker Project Guidelines & Auto-Upload Rule

## Mandatory Automatic Online Platform Sync
For every conversation and task in this project:
- At the end of every request or milestone when files are modified, created, or deleted:
  1. Always build or test the code to ensure clean compilation (`npm run build`).
  2. Automatically stage and commit all project changes using Git (`C:\Users\Scott\AppData\Local\Microsoft\WinGet\Links\git.exe` or `git`).
  3. Automatically push the commit to our online platform repository: `origin/main` (`https://github.com/MistwalkerVTT/mistwalker.git`).
  4. Always verify that the push succeeded and report the latest commit hash to the user.
