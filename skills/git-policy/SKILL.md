---
name: git-policy
description: Use when changing branches, syncing, committing, pushing, or closing out a task, and when checking the allowed and forbidden git operations.
---

# Git policy

You never edit files. You never merge, rebase, cherry-pick, reset, or revert. You never open or merge an MR.

## Inputs

- The mode: dispatched by `tdd` or a manual session, with the target branch or task number.
- Task number and base branch: take both only from the user's message. Never infer them from the current branch, commits, or file names. Base ∈ {`test`, `main`, `develop`}; exception — `worktree.create <branch> <base>`: base is any existing branch explicitly named by the user (the start point is `origin/<base>`). For `branch.create` and Cervart task plans the base stays ∈ {`test`, `main`, `develop`}.
- Initials from `local.md` in the repository root. If the file is missing or the value is invalid (not two lowercase Latin letters), stop and ask.

## Process

### Modes

Dispatched by `tdd` — the first line of the task is one of:

- `branch.create <branch>`
- `branch.switch <branch>`
- `коммит <task-number>`
- `коммит-конфиг <T-id>`
- `закрыть <task-number>`
- `worktree.create <branch> <base> [имя]`
- `worktree.remove [имя]`
- `wip.sync <branch>`
- `wip.unsync <branch>`

A batch confirmation from the `tdd` user («продолжи всё») pre-covers the sequential `коммит <task-number>` dispatches of the remaining tasks up to `G`; `закрыть <task-number>` always requires its own explicit confirmation.

From `tdd` you may operate only on the base branch (`test`, `main`, `develop`) and the task branch.

Manual session — act only on an explicit user command: commit (`коммит <task-number>`), push, close-out (`закрыть <task-number>`), `branch.switch <branch>`, worktree lifecycle («создай общий worktree [от <base>]» → `worktree.create`, «удали worktree» → `worktree.remove`), or WIP sync («синхронизируй WIP» → `wip.sync <branch>», «убери WIP-синк» → `wip.unsync <branch>`). Worktree creation/removal and WIP sync never run automatically. The target branch may be any existing branch, including `main`, `test`, and `develop`.

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
- In worktree mode the main folder is never switched or pulled (no `switch`/`pull` in `<main>`, `-C` forms included), and the task branch is never checked out in the main folder.

### Worktree mode

All worktree and WIP paths are absolute. Determine `<main>` with `git worktree list` — the first line is the main folder; `<wt>` is the absolute worktree path, `<main>/../cervart-wt/<имя>` (default name `agent`). Inside the worktree plain git commands run with cwd = worktree; commands touching other folders use `git -C <абс-путь>`.

`worktree.create <branch> <base> [имя]` (default `agent`):

1. `git fetch origin`.
2. `git worktree add <main>/../cervart-wt/<имя> -b <branch> origin/<base>` — the absolute path is correct from any folder of the repository, the worktree included.
3. Set the worktree up with cwd = worktree: `cp <main>/.npmrc .npmrc`, `corepack enable`, `corepack prepare pnpm@11.5.1 --activate`, `pnpm install`, `pnpm gen-env-<env>` (the env comes from the user's context).

`branch.create <branch>` dispatched from inside a worktree (worktree-mode `tdd` entry): check the clean tree rule IN the worktree before creating the branch, then `git fetch origin` and `git switch -c <branch> origin/<base>` — the start point is always `origin/<base>` (the worktree HEAD may sit on the previous task's branch). `git pull --ff-only` is not needed in this mode.

`worktree.remove [имя]` — only on an explicit user request («удали worktree»):

1. The worktree must be clean: `git -C <wt> status --porcelain`; a dirty tree → ask the user, never force.
2. If the session's cwd is inside the worktree being removed, report «сначала вернуть сессию в основную папку» (git refuses to delete its own cwd) and stop.
3. `git worktree remove <абс-путь>`. Force forms (`-f`, `--force`) are forbidden.

### WIP sync

`wip.sync <branch>` / `wip.unsync <branch>` run only on an explicit user command («синхронизируй WIP» / «убери WIP-синк»), never automatically. `<san>` is `<branch>` with every `/` replaced by `_` (a slash is invalid in a file name); the patch file is `<main>/.tmp/wip-sync/<san>.patch`, the base is stored next to it in `<san>.base`.

`wip.sync <branch>`:

1. `mkdir -p <main>/.tmp/wip-sync` — `git diff --output` does not create directories.
2. If the patch file exists: `git -C <main> apply --check -R <патч>`; applicable → `git -C <main> apply -R <патч>`; not applicable → skip the rollback (the patch is already reverted) and continue. The applied/reverted state is decided by this probe alone, never by the file's existence.
3. `git -C <wt> add -N .` — intent-to-add so new files appear in the diff (the agreed exception from «Never `git add .`»: this is not commit staging).
4. `git -C <wt> diff origin/<base> --output=<main>/.tmp/wip-sync/<san>.patch` — the full diff from `origin/<base>` (commits + uncommitted); save the base into `<san>.base`.
5. `git -C <main> apply` the new patch: the main folder now carries the task's diff as uncommitted changes.

Patch files are never removed (harmless thanks to the probe in step 2). Any step fails → report, never force.

`wip.unsync <branch>`: `git -C <main> apply --check -R <патч>` → applicable → `git -C <main> apply -R <патч>`; not applicable → report «патч не применён».

### Commit of the `.opencode` config repository

`коммит-конфиг <T-id>` commits the nested `.opencode` repository (config plans without a task number): `git -C <main>/.opencode add <пути>`, then `git -C <main>/.opencode commit -m "<сообщение>"`. The paths and the message arrive verbatim from the plan task's `commit:` line and its affected files.

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
