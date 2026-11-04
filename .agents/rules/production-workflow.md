# MistWalker Production Workflow & Conversation Hygiene Rule

## 1. Production Target
MistWalker focuses 100% on the single, high-reliability production environment:
- **Active Branch**: `v1-stable`
- **Live URL**: `https://mistwalker.onrender.com/`
- **Render Production Service**: `srv-db93bu3bc2fs73cn795g`

---

## 2. Conversation Hygiene & Single Responsibility
To keep agent conversations fast and token usage lean:
- **Focused Scope**: Dedicate each conversation to a specific feature, bugfix, or tactical optimization on `v1-stable`.
- **Pre-Flight Check**: Always verify the current branch with `git status` before beginning work.
- **Context Pruning**: Use `/compact` when transitioning between debugging and deployment to clear out stale tool outputs.
- **Cross-Thread References**: Reference prior conversations via `@` mentions or link file paths instead of copying and pasting large logs.

---

## 3. Production Release Protocol
1. Compile and verify with `cmd.exe /c "npm run build"`.
2. Commit to `v1-stable` and push to `origin/v1-stable`.
3. Deploy to Render via `node scripts/deploy.js --prod`.
4. Verify HTTP 200 on `https://mistwalker.onrender.com/`.
