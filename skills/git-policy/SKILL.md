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
- `commit <task-identifier>`
- `close <task-identifier>`
- `worktree.create <branch> <base> [name]`
- `worktree.remove [name]`

From `tdd` you may operate only on the declared base branch and the task branch. A batch confirmation from the `tdd` user («продолжи всё») pre-covers the sequential `commit` dispatches of the remaining tasks; `close` always requires its own explicit confirmation.

Manual session — act only on an explicit user command: commit, push, close-out, `branch.switch <branch>`, or a worktree lifecycle request («создай worktree [от <base>]» → `worktree.create`, «удали worktree» → `worktree.remove`). Worktree creation and removal never run automatically. The target branch may be any existing branch, but pushes stay restricted to task branches.

### Branch names

- With initials and a task number: `XX_<type>/<task-number>-<kebab-slug>`, for example `km_feat/22916-user-page`.
- Without them: `<type>/<kebab-slug>`, for example `feat/user-page`.
- `<type>` is one of `feat`, `fix`, `chore`, `build`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`.
- `<kebab-slug>` uses lowercase letters and digits separated by single hyphens.
- Create the task branch from the base branch named by the user or the plan.
- Check that a branch exists with `git branch --list` or `git branch -a` before switching to it.
- Create a new task branch with `git switch -c <branch>`.
- Invariant: a task branch never gets an upstream. When the start point is `origin/<base>`, create it with `--no-track`; an auto-configured upstream would make a later `git pull` silently merge the base and an upstream-following push could move the protected branch without a merge commit.

### Clean tree rule

Before `git switch`, run `git status --porcelain`.

- Untracked files (`??`) are allowed and survive the switch.
- Staged or modified tracked files (`M`, `A`, `D`, `R`, `C`) mean the tree is dirty: return `BLOCKED` and list the paths.
- Never use `git switch -f`, `--force`, `-C`, or `--discard-changes`.

### Switch and sync

- Switch only on a clean tree and only on an explicit user confirmation or a `tdd` dispatch for the base or task branch.
- After switching to the base branch, run `git pull --ff-only`. If it diverges, return `BLOCKED`.
- Never switch to a protected branch with a force or discard variant.

### Worktrees

`worktree.create <branch> <base> [name]` (default name `agent`):

1. `git fetch origin`.
2. `git worktree add <main>/../<name> -b <branch> --no-track origin/<base>` — `<main>` is the first line of `git worktree list`; the sibling path is correct from any folder of the repository.
3. Report that moving a session into the worktree may require the agent kit (see the README adaptation guide) and a service restart when the project uses a linked `.opencode` kit.
4. The worktree is created; never run project setup commands (installs, env generation) automatically — they belong to the user or the variant's documented flow.

`worktree.remove [name]` — only on an explicit user request:

1. The worktree must be clean: `git -C <wt> status --porcelain`; a dirty tree → ask the user, never force.
2. If the session's cwd is inside the worktree being removed, report «сначала вернуть сессию в основную папку» and stop.
3. `git worktree remove <абс-путь>`. Force forms (`-f`, `--force`) are forbidden.

Inside a worktree, plain git commands run with cwd = worktree; commands touching other folders use `git -C <абс-путь>`.

### Merge

Never merge. The pull/merge request and the merge itself are always manual and stay with the user.

### Commit

- Conventional Commits: `<type>: <task-number> <summary>`, or `<type>: <summary>` when there is no task number. Use `fix`, not `hotfix`.
- Follow the project's commit-message language and format conventions when they are documented; when they are not, mirror the recent `git log` style.
- Subject at most 72 characters, each body line at most 100 characters.
- Stage only explicit paths or use `git add -u`. Never use `git add .`, `-A`, `-p`, `-i`, or `-f`.
- Never use `--amend`, `--no-verify`, `-n`, `-e`, or `-c`.
- Pre-commit hooks must pass. Use a generous timeout and never bypass them. On failure, return `BLOCKED` with the reason.

### Task commit

`commit <task-identifier>` means one commit for the work that is already accepted, and nothing else:

1. Stage the explicit paths of the current task, or use `git add -u`.
2. Commit following the Commit rules above.
3. Stop. There is no push here: pushing belongs to `close <task-identifier>`.

If the tree has nothing to stage, return `DONE` and report that there is nothing to commit.

### Commit of the nested config repository

`config.commit <message>` commits the nested `.opencode` repository when the project keeps its agent kit as a separate repo: `git -C <project>/.opencode add <paths>`, then `git -C <project>/.opencode commit -m "<message>"`. The paths and the message arrive verbatim from the plan or the user; the same Commit rules apply inside the nested repo.

### Push

- Push only the task branch: `git push origin <task-branch>`.
- Never force, delete, push tags, mirror, or push to a protected branch.
- Do not set upstream unless the user asks; the permission patterns deny `git push * -*`.

### Close-out

A close-out means:

1. Commit if the tree is dirty — compose the residual commit message yourself, following the Commit rules.
2. Push the task branch.
3. Report the branch name, commit hashes, push result, remaining uncommitted files, and a suggested pull/merge request title.

Never merge and never open or merge a pull/merge request.

## Output

`DONE` or `BLOCKED` with the exact commands run and their results. Answer the user in Russian.

## BLOCKED

- The tree is dirty for a switch, or a branch does not exist.
- The branch name does not match the pattern.
- A pre-commit hook fails.
- The command would merge, rebase, cherry-pick, force push, or push to a protected branch.

## Out of scope

Editing files, resolving conflicts, creating pull/merge requests, merging, and changing git configuration. File deletions go through the `delete_file` tool, never shell `rm`.
