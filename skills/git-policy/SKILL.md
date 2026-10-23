---
name: git-policy
description: Use when changing branches, syncing, committing, pushing, or closing out a task, and when checking which git operations are allowed or forbidden.
---

# Git policy

You never edit files. You never merge, rebase, cherry-pick, reset, or revert. You never open or merge a pull/merge request.

## Inputs

- The mode: dispatched by `tdd` or a manual session, with the target branch or task identifier.
- Task number, base branch, and initials: use them only when the user provides them. Never infer them from the current branch, commits, or file names.
- Integration branches (the ones that must not receive direct pushes) are whatever the user or the repository declares; otherwise treat `main`, `master`, `develop`, `test`, `trunk`, and `release` as protected.

## Process

### Modes

Dispatched by `tdd` — the first line of the task is one of:

- `branch.create <branch>`
- `branch.switch <branch>`
- `close <task-identifier>`

From `tdd` you may operate only on the declared base branch and the task branch.

Manual session — act only on an explicit user command: commit, push, close-out, or `branch.switch <branch>`. The target branch may be any existing branch, but pushes stay restricted to task branches.

### Branch names

- With initials and a task number: `XX_<type>/<task-number>-<kebab-slug>`, for example `km_feat/22916-user-page`.
- Without them: `<type>/<kebab-slug>`, for example `feat/user-page`.
- `<type>` is one of `feat`, `fix`, `chore`, `build`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`.
- `<kebab-slug>` uses lowercase letters and digits separated by single hyphens.
- Create the task branch from the base branch named by the user.
- Check that a branch exists with `git branch --list` or `git branch -a` before switching to it.
- Create a new task branch with `git switch -c <branch>`.

### Clean tree rule

Before `git switch`, run `git status --porcelain`.

- Untracked files (`??`) are allowed and survive the switch.
- Staged or modified tracked files (`M`, `A`, `D`, `R`, `C`) mean the tree is dirty: return `BLOCKED` and list the paths.
- Never use `git switch -f`, `--force`, `-C`, or `--discard-changes`.

### Switch and sync

- Switch only on a clean tree and only on an explicit user confirmation or a `tdd` dispatch for the base or task branch.
- After switching to the base branch, run `git pull --ff-only`. If it diverges, return `BLOCKED`.
- Never switch to a protected branch with a force or discard variant.

### Merge

Never merge. The pull/merge request and the merge itself are always manual and stay with the user.

### Commit

- Conventional Commits: `<type>: <task-number> <summary>`, or `<type>: <summary>` when there is no task number. Use `fix`, not `hotfix`.
- Subject at most 72 characters, each body line at most 100 characters.
- Stage only explicit paths or use `git add -u`. Never use `git add .`, `-A`, `-p`, `-i`, or `-f`.
- Never use `--amend`, `--no-verify`, `-n`, `-e`, or `-c`.
- Pre-commit hooks must pass. Use a generous timeout and never bypass them. On failure, return `BLOCKED` with the reason.

### Push

- Push only the task branch: `git push origin <task-branch>`.
- Never force, delete, push tags, mirror, or push to a protected branch.
- Do not set upstream unless the user asks; the permission patterns deny `git push * -*`.

### Close-out

A close-out means:

1. Commit if the tree is dirty.
2. Push the task branch.
3. Report the branch name, commit hashes, push result, remaining uncommitted files, and a suggested pull/merge request title.

Never merge and never open or merge a pull/merge request.

## Output

`DONE` or `BLOCKED` with the exact commands run and their results.

## BLOCKED

- The tree is dirty for a switch, or a branch does not exist.
- The branch name does not match the pattern.
- A pre-commit hook fails.
- The command would merge, rebase, cherry-pick, force push, or push to a protected branch.

## Out of scope

Editing files, resolving conflicts, creating pull/merge requests, merging, and changing git configuration.
