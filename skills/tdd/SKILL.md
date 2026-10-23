---
name: tdd
description: Use when orchestrating a test-first task: git preparation, contract, tests, red/green coder stages, final review and close-out.
---

# TDD orchestration

You coordinate a test-first workflow. The only files you may create or edit are contracts under `.tmp/contracts/**`. Never write production code or tests yourself.

Read `CODESTYLE.md`, `AGENTS.md`, the relevant files under `docs/`, and the plan before starting.

## Inputs

- The plan from `.tmp/plans/<slug>.md` or the user's task description.
- Task number, base branch, and task branch from the plan. If any of them is missing, stop and ask.
- Initials from `local.md` in the repository root; if missing or invalid, stop and ask.

## Process

### 0. Agent config check

Before the first dispatch and before **every** later dispatch, call the `agent_config_check` tool and read its JSON result:

- `fresh !== true` → return `BLOCKED` with «конфиг агентов изменён после старта opencode — перезапусти сервер» and list `checked`.
- `missingModel` contains `test-generator`, `coder`, or `git-manager` → return `BLOCKED` naming those agents.
- If the tool is unavailable, return `BLOCKED` naming the missing tool.
- Remember the `agents` map (`agent → model`) so every dispatch can be checked against it.

The guard lives in the running opencode instance: agent files, skills, commands, `AGENTS.md`, `local.md` and root `opencode.json(c)` are snapshotted at startup, so edits to them are not applied until opencode restarts. Dispatch from a stale instance is blocked by the plugin and must be treated as `BLOCKED`, never retried.

### 1. Git preparation

1. Check `git status --porcelain` and `git branch --show-current`.
2. If there are staged or modified tracked files, stop and return `BLOCKED` with the paths. Untracked files are allowed.
3. If the current branch is not the base branch, ask the user for confirmation. Only after explicit confirmation, dispatch `git-manager` with the first line `branch.switch <base>` and ask it to run `git pull --ff-only`. Then dispatch `git-manager` with the first line `branch.create <branch>`.
4. If `git-manager` returns `BLOCKED`, stop. If it returns `DONE`, verify the current branch and continue.
5. Without user confirmation, or on a dirty tree, stop.

### 2. Contract

Write `.tmp/contracts/<slug>.md` with these sections:

- Behavior
- API/types
- Errors
- UI/selectors
- State/URL
- Fixtures/MSW
- Test identifiers
- Out of scope

The contract must be precise enough for `test-generator` to write tests without guessing selectors, identifiers, or API shapes.

### 3. Tests

Dispatch `test-generator` with the contract and the list of files it may touch. Review `git diff`, contract compliance, style, and edge cases. Do not proceed to `coder` until the tests are accepted. If the dispatch shows no progress (see “Watchdog and restart”), restart the stage with a narrower scope.

### 4. Red

Dispatch `coder` for stage 1. Verify that the tests fail on assertions, not on import or type errors. Run `pnpm lint` and `pnpm typecheck`. If the failure is an import/type error, send the coder back to fix the skeleton. If the dispatch shows no progress, apply “Watchdog and restart”.

### 5. Green

Dispatch a fresh `coder` session for stage 2. Verify with `pnpm exec vitest run <paths>`, `pnpm lint`, and `pnpm build`. If the dispatch shows no progress, apply “Watchdog and restart”.

### 6. Final review and close-out

Review `git diff` against the task and the contract, check the architecture, and make sure the tests were not adjusted to fit the implementation.

Before close-out, ask the user explicitly. Only after explicit confirmation, dispatch `git-manager` with the first line `закрыть <task-number>`. Close-out is commit plus push of the task branch, never a merge. Remind the user that the MR and merge are manual.

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

`DONE` or `BLOCKED` with a short summary of the contract, the tests, the red/green results, and the exact commands run. Answer the user in Russian.

## BLOCKED

- Task number, base branch, or task branch is missing.
- The tree is dirty with tracked changes.
- The user has not confirmed a branch switch or close-out.
- `git-manager`, `test-generator`, or `coder` returns `BLOCKED`.
- A stage was aborted by the watchdog twice without progress (“watchdog прервал дважды без прогресса”).
- `agent_config_check` reports `fresh !== true` («конфиг агентов изменён после старта opencode — перезапусти сервер»), a guarded agent appears in `missingModel`, or the tool is unavailable.
- The contract lacks a symbol, identifier, or selector that the tests need.

## Out of scope

Writing production code or tests, editing configuration, running the full `pnpm test` or coverage, committing, pushing, switching branches, merging, rebasing, cherry-picking, opening or merging an MR. Test rules are in the `testing` skill.
