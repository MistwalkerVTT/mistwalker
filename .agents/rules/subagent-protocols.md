# MistWalker Subagent & Task Protocols

## 1. Subagent Scoping & Delegation Guidelines
Subagents keep the primary conversation clean and prevent large tool outputs from bloating the context window. Follow these rules for subagent usage in MistWalker:

### A. Read-Heavy Research Delegation
- Delegate broad searches, multi-file inspection, and documentation checks to the built-in **`research`** subagent.
- The `research` subagent runs read-only queries in an isolated sandbox and returns a concise, actionable summary to the main conversation without polluting it with raw grep dumps or hundreds of lines of file text.

### B. Workspace Isolation for Code Changes (`Workspace: 'branch'`)
- When launching a subagent to write code, refactor components, or experiment with complex changes, always set `Workspace: 'branch'`.
- This creates an isolated Git worktree so the subagent's temporary edits cannot collide with the parent working directory or corrupt active user edits.
- Review diffs before merging them back to the active working tree.

### C. Cloud Firestore Security Rules
- Any creation, review, or modification of `firestore.rules` MUST be delegated to the specialized **`firestore-rules-author`** subagent.
- Never write ad-hoc modifications directly to `firestore.rules` in the main agent when this specialist is available.

---

## 2. Subagent Lifecycle Hygiene
- **No Idle Subagents**: Check active subagents using `manage_subagents` (action: `'list'`) and terminate completed or stale subagents using `manage_subagents` (action: `'kill'`).
- **Single Objective per Subagent**: Keep subagent prompts atomic and task-specific. Never assign an open-ended multi-feature goal to a single subagent.
