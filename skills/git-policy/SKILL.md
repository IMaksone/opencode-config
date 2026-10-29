---
name: git-policy
description: Use when changing branches, syncing, committing, pushing, or closing out a task, and when checking the allowed and forbidden git operations.
---

# Git policy

You never edit files. You never merge, rebase, cherry-pick, reset, or revert. You never open or merge an MR.

## Inputs

- The mode: dispatched by `tdd` or a manual session, with the target branch or task number.
- Task number and base branch: take both only from the user's message. Never infer them from the current branch, commits, or file names. Base ∈ {`test`, `main`, `develop`}.
- Initials from `local.md` in the repository root. If the file is missing or the value is invalid (not two lowercase Latin letters), stop and ask.

## Process

### Modes

Dispatched by `tdd` — the first line of the task is one of:

- `branch.create <branch>`
- `branch.switch <branch>`
- `коммит <task-number>`
- `закрыть <task-number>`

A batch confirmation from the `tdd` user («продолжи всё») pre-covers the sequential `коммит <task-number>` dispatches of the remaining tasks up to `G`; `закрыть <task-number>` always requires its own explicit confirmation.

From `tdd` you may operate only on the base branch (`test`, `main`, `develop`) and the task branch.

Manual session — act only on an explicit user command: commit (`коммит <task-number>`), push, close-out (`закрыть <task-number>`), or `branch.switch <branch>`. The target branch may be any existing branch, including `main`, `test`, and `develop`.

### Branch names

Pattern shape: `XX_<type>/<task-number>-<kebab-slug>`, for example `km_feat/22916-user-page`.

```text
^[a-z]{2}_(feat|fix|chore|build|ci|docs|style|refactor|perf|test(?:ease)?)/\d+-[a-z0-9]+(?:-[a-z0-9]+)*$
```

- `XX` — the user's initials from `local.md` in the repository root, two lowercase Latin letters. Never infer them.
- `<type>` — one of `feat|fix|chore|build|ci|docs|style|refactor|perf|test`; `testease` is also accepted.
- `<task-number>` — digits, provided by the user. Never infer it from the branch, commits, or file names.
- `<kebab-slug>` — lowercase letters and digits separated by single hyphens.
- Create the task branch from the base branch named by the user or the plan.
- Check that a branch exists with `git branch --list` or `git branch -a` before switching to it.
- Create a new task branch with `git switch -c <branch>`.

### Clean tree rule

Before `git switch`, run `git status --porcelain`.

- Untracked files (`??`) are allowed and survive the switch.
- Staged or modified tracked files (`M`, `A`, `D`, `R`, `C`) mean the tree is dirty: return `BLOCKED` and list the paths.
- Never use `git switch -f`, `--force`, `-C`, or `--discard-changes`.

### Switch and sync

- Switch only on a clean tree and only on an explicit user confirmation or a `tdd` dispatch for the base/task branch.
- After switching to the base branch, run `git pull --ff-only`. If it diverges, return `BLOCKED`.
- Switching to `main`, `test`, or `develop` is allowed. Pushing to them is forbidden.
- Never switch with a force or discard variant; they are forbidden.

### Merge

Never merge. The MR to `test`/`develop`/`main` and the merge itself are always manual and stay with the user.

### Commit

- Conventional Commits: `<type>: <task-number> <summary>`. Use `fix` instead of `hotfix`.
- Subject at most 72 characters, each body line at most 100 characters.
- Stage only explicit paths or use `git add -u`. Never use `git add .`, `-A`, `-p`, `-i`, or `-f`.
- Never use `--amend`, `--no-verify`, `-n`, `-e`, or `-c`.
- Pre-commit hooks (`lint-staged`, `git-precommit-checks`, `pnpm typecheck`, `vitest run --changed`) must pass. Use a generous timeout and never bypass them. On failure, return `BLOCKED` with the reason.

### Task commit

`коммит <task-number>` means one commit for the work that is already accepted, and nothing else:

1. Stage the explicit paths of the current task, or use `git add -u`.
2. Commit with Conventional Commits: `<type>: <task-number> <summary>`.
3. Stop. There is no push here: pushing belongs to `закрыть <task-number>`, and the MR and merge stay manual.

A `tdd` dispatch carries the plan task's `commit:` message and the explicit paths to stage — use both verbatim: the message becomes the commit subject, the paths are the staging list.

If the tree has nothing to stage, return `DONE` and report that there is nothing to commit.

### Push

- Push only the task branch: `git push origin <task-branch>`.
- Never force, delete, push tags, mirror, or push to `main`, `test`, or `develop`.
- Do not use `-u` or `--set-upstream`; the permission patterns deny `git push * -*`.

### Close-out

`закрыть <task-number>` means:

1. Commit if the tree is dirty.
2. Push the task branch.
3. Report the branch name, commit hashes, push result, remaining uncommitted files, and a suggested MR title.

Never merge and never open or merge an MR.

## Output

`DONE` or `BLOCKED` with the exact commands run and their results. Answer the user in Russian.

## BLOCKED

- The tree is dirty for a switch, or a branch does not exist.
- Initials are missing or invalid.
- The branch name does not match the pattern.
- A pre-commit hook fails.
- The command would merge, rebase, cherry-pick, force push, or push to an integration branch.

## Out of scope

Editing files, resolving conflicts, creating MRs, merging, and changing git configuration.
