---
name: tdd
description: Use when orchestrating a test-first task: git preparation, contract, tests, red/green per plan task with pauses, final review and close-out.
---

# TDD orchestration

You coordinate a test-first workflow. The only files you may create or edit are the contract and the progress file under `.tmp/contracts/**`. Never write production code or tests yourself, and never edit the plan.

Read `CODESTYLE.md`, `AGENTS.md`, the relevant files under `docs/`, and the plan before starting.

## Inputs

- The plan from `<project root>/.opencode/plans/<slug>.md` or the user's task description.
- Task number, base branch, and task branch from the plan. If any of them is missing, stop and ask.
- Initials from `local.md` in the repository root; if missing or invalid, stop and ask.

## Process

### 0. Agent config check

Before the first dispatch and before **every** later dispatch, call the `agent_config_check` tool and read its JSON result:

- `fresh !== true` → return `BLOCKED` with «конфиг агентов изменён после старта opencode — перезапусти сервер» and list `checked`.
- `missingModel` contains `test-generator`, `coder`, or `git-manager` → return `BLOCKED` naming those agents.
- If the tool is unavailable, return `BLOCKED` naming the missing tool.
- Remember the `agents` map (`agent → model`) so every dispatch can be checked against it.

The guard lives in the running opencode instance and its snapshot is bound to the **process**, not to a plugin load: agent files, skills, commands, `AGENTS.md`, `local.md` and root `opencode.json(c)` are snapshotted when the process starts. OpenCode reloads the plugin on every config save without re-taking that snapshot, so edits are not applied until the process restarts. Dispatch from a stale instance is blocked by the plugin and must be treated as `BLOCKED`, never retried.

### 1. Git preparation

1. Check `git status --porcelain` and `git branch --show-current`.
2. If there are staged or modified tracked files, stop and return `BLOCKED` with the paths. Untracked files are allowed.
3. If the current branch is not the base branch, ask the user for confirmation. Only after explicit confirmation, dispatch `git-manager` with the first line `branch.switch <base>` and ask it to run `git pull --ff-only`. Then dispatch `git-manager` with the first line `branch.create <branch>`.
4. If `git-manager` returns `BLOCKED`, stop. If it returns `DONE`, verify the current branch and continue.
5. Without user confirmation, or on a dirty tree, stop.

For a local-only plan (`branch: none`, the files are gitignored) there is nothing to switch or create: check `git status --porcelain` only and continue on the current branch.

### 2. Progress file

Read `.tmp/contracts/<slug>.progress.md` before the first task:

- The file is missing → create it with one checkbox per plan task plus `G`, and a `Last:` line.
- The file exists → compare its task IDs and order with the plan. A mismatch means the plan or the progress file changed behind the run's back: return `BLOCKED` and ask the user which one is authoritative. Never guess and never renumber by hand.
- Continue from the first unchecked task; never re-run a checked one.

Format:

```md
# <slug>

- [x] T1 <goal>
- [ ] T2 <goal>
- [ ] G git close-out

Last: T1 done+committed, next T2
```

Before starting a new plan: if `.tmp/contracts/` holds an unfinished progress file of another plan, offer the user to finish that plan to `G` first or to park it explicitly (a note in its `Last:` line). Never run a new plan in parallel with an open one.

### 3. Contract

Write `.tmp/contracts/<slug>.md` **once** for the plan, with these sections:

- Behavior
- API/types
- Errors
- UI/selectors
- State/URL
- Fixtures/MSW
- Test identifiers
- Out of scope

The contract must be precise enough for `test-generator` to write tests without guessing selectors, identifiers, or API shapes.

### 4. Task loop

One iteration handles exactly one task from the plan section `Tasks`. A plan without a `Tasks` section is a single task for the whole plan (legacy fallback).

Run every verify command as a single shell call. Wrappers stay forbidden for `cd`, `&&` chains, `;`, `>`-redirects, and `echo` probes: the permission scanner checks a compound command part by part, so one unknown part rejects the whole call. Filter pipes are allowed and preferred — `… 2>&1 | tail -80` and `… | grep -E '<failure markers>'` pass the scanner because `tail *`/`grep *`/`head *` are allow-listed. One run — one result: the truncated preview hides failure summaries (they sit at the end of the output), so build the filter into the first and only run; re-running the same command to change its filter is forbidden; for a deep dive use `pnpm exec vitest run <paths> --reporter=json --outputFile=.tmp/<slug>.json` and inspect the file with `rg`/`cat`. Batch Vitest paths: every affected test file goes into one `pnpm exec vitest run` call (one cold start) — never one file per run and never concurrent duplicates of the same tests.

For each task:

1. Call `agent_config_check` (step 0) and stop on any blocking result.
2. Tests: dispatch `test-generator` with the contract, the task, and the list of files it may touch. Review `git diff`, contract compliance, style, and edge cases. Do not proceed to `coder` until the tests are accepted. For Markdown and config tasks with `tests: existing suite / manual check` skip this dispatch.
3. Red: dispatch `coder` for stage 1 (skeleton). Verify that the tests fail on assertions, not on import errors. Run `pnpm typecheck` — the skeleton's type gate; the coder's stage 1 already ran the targeted eslint, so the orchestrator does not repeat a full lint here. If the failure is an import/type error, send the coder back to fix the skeleton.
4. Green: dispatch a fresh `coder` session for stage 2. Verify with the task's `verify` commands plus `pnpm lint` and `pnpm typecheck`. Vitest is already part of the task's `verify`; launch a separate `pnpm exec vitest run` only when `verify` does not cover it — then as one call over all the task's paths.
   Optional live check (UI-changing tasks only, and only when the user has already started the dev server): after green, run `browser_browser_navigate` to `http://localhost:3000<route>` (the dev port is pinned by `vite.config.ts`, `strictPort`; `5173`/`4173` never exist here — the `browser-guard` plugin denies them), then `browser_browser_snapshot` / `browser_browser_find` for the expected elements and `browser_browser_console_messages` for new errors versus the baseline (React DevTools INFO banner; `GET .../auth/me 401` pairs during session start/expiry). Never start the dev server yourself, never enter Keycloak credentials — the manual login belongs to the user. One snapshot per check. If the dev server is not running, skip the live check; it is not blocking.
5. Mark the task as done in the progress file and update the `Last:` line.
6. **Pause, report, commit**: report «сделано / осталось / следующая» and end with «закоммитить T<n> и продолжаем?». Only on an explicit «продолжи»:
   1. dispatch `git-manager` with the first line `коммит <task-number>`, passing the task's `commit:` message and its explicit paths from the plan — stage exactly those paths;
   2. on `DONE` continue with the next task; on `BLOCKED` (for example a failed pre-commit hook) stop and report — the next task never starts on an uncommitted tree;
   3. for a local-only plan (`branch: none`) skip the dispatch — there is nothing to commit.

   Any other reply keeps the run paused.

   Batch continuation: an explicit «продолжи всё» / «продолжи до G» pre-confirms the per-task commits of all remaining tasks — run them without pauses, committing each task through `git-manager` right after its green gate. Mandatory stops remain: before `G` (close-out always needs its own explicit confirmation), on any `BLOCKED`, and on a failed pre-commit hook. Manual-QA items from `verify` never block a task on their own: collect them into a running list and show it as one checklist at the pause before `G`.

When a task includes file deletions, pass their exact list from the plan to the `coder` prompt with the instruction «удалить инструментом `delete_file`; shell `rm` запрещён». For test-file deletions (`*.test.ts`, `*.test.tsx`, `*.testHelpers.ts`, `src/shared/testing/**`, `src/shared/api/testing/**`) carry the plan's mark that the user confirms each deletion through the tool's ask-prompt; a user refusal makes the task `BLOCKED`. `tdd` never deletes anything itself.

A task is accepted only when its own `verify` passes. `pnpm build` and the full `pnpm test` belong to the final review, not to every task.

If a dispatch shows no progress, apply “Watchdog and restart”.

### 5. Final review and close-out

Review the committed work against the plan and the contract — `git diff <base>...HEAD` on the task branch — check the architecture, and make sure the tests were not adjusted to fit the implementation. Run the plan-wide checks: `pnpm build` and `pnpm test`.

Every task was committed at its own pause, so the tree must be clean here. A dirty tree means an unaccepted leftover: return `BLOCKED` with the paths.

Before close-out, ask the user explicitly. Only after explicit confirmation dispatch `git-manager` with the first line `закрыть <task-number>` (it commits leftovers if the tree is dirty, then pushes the task branch).

Close-out is push of the task branch, never a merge. Remind the user that the MR and merge are manual.

For a local-only plan (`branch: none`, gitignored files) the task `G: git close-out` is only a `git status` check in every affected repository, and `tdd` makes no commit.

## Watchdog and restart

A local opencode plugin (`.opencode/plugins/subagent-watchdog.ts`) aborts any subagent session that stays `busy`/`retry` without activity for 10 minutes. Treat an aborted subagent as a hung step, not as a result.

Signs that a stage made no progress:

- the dispatch returned `Task cancelled` or `Task failed`;
- the result is empty;
- for a stage that writes files, `git diff --stat` shows no new lines compared with the snapshot taken right before the dispatch.

Reaction:

1. Take a `git diff --stat` snapshot before every dispatch, so “no progress” can be checked afterwards.
2. On no progress, re-dispatch the same stage with a **fresh** session (never resume the hung one with `task_id`) and a narrowed scope: fewer files, a subset of the contract, or a single test file.
3. Allow at most two restarts per stage. After the second failed restart return `BLOCKED` with “watchdog прервал дважды без прогресса” and list what was already verified.
4. A long run that finishes successfully with real changes is accepted, even if it took longer than 10 minutes. Elapsed time alone is never a reason to restart.

While `tdd` runs, its own child sessions keep it alive: activity of a child refreshes the parent. Only a genuinely silent session is aborted.

## Output

`DONE` or `BLOCKED` with a short summary of the contract, the tasks processed, the red/green results, and the exact commands run. Answer the user in Russian.

## BLOCKED

- Task number, base branch, or task branch is missing.
- The tree is dirty with tracked changes.
- The user has not confirmed a branch switch or close-out.
- `git-manager`, `test-generator`, or `coder` returns `BLOCKED`.
- A stage was aborted by the watchdog twice without progress (“watchdog прервал дважды без прогресса”).
- `agent_config_check` reports `fresh !== true` («конфиг агентов изменён после старта opencode — перезапусти сервер»), a guarded agent appears in `missingModel`, or the tool is unavailable.
- The contract lacks a symbol, identifier, or selector that the tests need.
- The progress file and the plan disagree on task IDs or order.

## Out of scope

Writing production code or tests, editing the plan or the application configuration, running the full `pnpm test` or coverage per task, pushing inside `коммит`, switching branches, merging, rebasing, cherry-picking, opening or merging an MR. Test rules are in the `testing` skill.
