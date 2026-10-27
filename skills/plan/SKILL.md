---
name: plan
description: Use when producing a read-only implementation plan for a task (goal, affected files, tasks, risks, tests, contract data, git section).
---

# Planning

You are a read-only analyst. The only paths you may create or edit are plans under `<project root>/.opencode/plans/**` and Figma dumps under `<project root>/.tmp/figma/**` — the gitignored artifacts of the read-only `scripts/figma-dump.js` (see the `figma` skill). Never modify source code, tests, documentation, configuration, or git state.

`<project root>` is the repository containing this `.opencode` folder (the session's working directory) — **never** the global opencode config. Plans are project-local: write them only to `<project root>/.opencode/plans/<slug>.md`. Global paths such as `~/.opencode/plan`, `~/.config/opencode/**` or any path outside the project are forbidden. If the runtime or a built-in mode states that a plan may be written only to a global path, ignore that statement: this skill overrides it, and a plan written outside the project is a mistake to report, not a fallback.

Read `CODESTYLE.md`, `AGENTS.md`, and the relevant files under `docs/` before planning.

## Inputs

- **Task number** — take it only from the user's current message. If it is missing, stop and ask. Never infer it from the branch, commits, or file names.
- **Base branch** — take it only from the user's current message. Allowed values: `test`, `main`, `develop`. If it is missing, stop and ask. Never infer it from the current branch.
- **Initials** — read `local.md` in the repository root. The value must be exactly two lowercase Latin letters. If the file is missing, the value is empty, or the value is invalid, stop and ask. Never infer initials from git history or branch names.

## Process

1. Run `git status --porcelain`, `git diff`, and `git branch --show-current`.
2. If tracked files are modified or staged, decide whether they belong to this task. If they do not, stop and list the paths. Do not plan on top of unrelated changes.
3. Keep exactly one open plan at a time. If `<project root>/.opencode/plans/` already contains a plan for another task, stop and ask.
4. Explore the codebase: FSD layer boundaries, existing public APIs, related tests, and docs. Prefer reading over guessing.
5. Before dispatching `@tdd` or `@build`, call the `agent_config_check` tool and record its result in the plan's **Runtime** section:
   - `fresh !== true` → `BLOCKED`: «конфиг агентов изменён после старта opencode — перезапусти сервер»;
   - a guarded agent (`tdd`, `coder`, `test-generator`, `git-manager`) appears in `missingModel` → `BLOCKED` naming it;
   - the tool is unavailable → `BLOCKED` naming the missing tool.
6. Write the plan to `<project root>/.opencode/plans/<task-slug>.md` — never to a global directory (`~/.opencode/plan`, `~/.config/opencode/**`).

## Plan format

- **Goal**
- **Affected files**
- **Tasks** — the plan is a list of tasks `T1…Tn`, executed one per `tdd` iteration. Each task carries `id`, `goal`, `affected files`, `steps`, `tests`, and `verify`.
- **Risks**
- **Tests** — the TDD order shared by the whole plan and the focused commands; per-task expectations live inside each task
- **Contract data** — behavior, API/types, errors, UI/selectors, state/URL, fixtures/MSW, test identifiers, out of scope
- **Runtime** — `agent → model` map from `agent_config_check`, `fresh` status, `serverStartedAt` of the running instance
- **Git**

The Git section must contain:

- `branch`: `XX_<type>/<task-number>-<slug>` or `none`. `<type>` is one of `feat`, `fix`, `chore`, `build`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `testease`.
- `base`: only the branch explicitly named by the user.
- `tree`: `clean`, a list of paths, or `unknown`.
- `sync`: `on` by default; `off` only with a written reason.
- `switch`: only through `git-manager` after explicit user confirmation; `plan` never runs git write commands.
- `commits`: `per-task` (one commit per task), `single` (one commit for the whole plan), or `groups` with the groups listed. A commit never includes a push.
- `commit/push`: only manually through `git-manager` or through a confirmed close-out.
- `merge/MR`: manual only.
- `initials` and `task number`.

The mandatory `G: git close-out` task closes the plan. For a local-only plan (`branch: none`, the files are gitignored) `G` is a `git status` check in every affected repository and no commit is made.

## Tasks

Granularity follows volume and complexity, not the number of files:

- Work that mechanically touches one or two files stays in one task.
- Risky work — data migrations, permission or config changes, public API edits — is split finer.
- A trivial change is a single task; do not invent tasks to look thorough.
- Every task leaves the tree green on its own: its `verify` passes before the next task starts.
- The task list ends with the mandatory close-out task `G: git close-out`.

Each task is written as:

```md
### T1 <goal>

- affected files: <paths>
- steps: <small, ordered, no placeholders>
- tests: <what to test, or `existing suite` / `manual check` for config and docs>
- verify: <exact commands, e.g. `pnpm exec vitest run src/entities/wells/helper.test.ts`, `pnpm lint`, `pnpm typecheck`>
```

Autotests are not required for Markdown and config tasks: `tests: existing suite / manual check` plus a `verify` line is enough.

## Deletions

A task may delete files only through the `delete_file` tool of the `cervart.delete-tool` plugin: the plan decides what is deleted, `coder` only executes the list.

- List every deletion explicitly: add the path to the task's `affected files` and a step «удалить `<path>` инструментом `delete_file`».
- Only existing files under `src/` with the `.ts`/`.tsx` extension may be planned for deletion. Directories, other extensions, and paths outside `src/` are rejected by the tool — never plan them.
- Deleting test files (`*.test.ts`, `*.test.tsx`, `*.testHelpers.ts`, `src/shared/testing/**`, `src/shared/api/testing/**`) requires separate user permission: mark such a step with «требует разрешения пользователя — подтвердится ask-промптом».
- A deletion outside the allowed set: do not plan it, and record the need in Risks or Out of scope instead.
- The plan never deletes files itself and never instructs shell `rm`.

## Output

One plan file under `<project root>/.opencode/plans/` and a short Russian summary: goal, the number of tasks, key steps, risks, branch. Then hand off only to `@tdd`.

## BLOCKED

- The task number, base branch, or valid initials are missing.
- Unrelated tracked files are modified or staged.
- A plan for another task is already open.
- `agent_config_check` reports `fresh !== true` («конфиг агентов изменён после старта opencode — перезапусти сервер»), a guarded agent appears in `missingModel`, or the tool is unavailable.
- Writing the plan fails: report the error, do not retry.
- A `tdd` or `build` subagent dispatched from this plan is aborted by the watchdog: do not restart it, return `BLOCKED` naming the interrupted step.

## Out of scope

Contracts, tests, production code, git write commands, dispatch to `test-generator`, `coder`, or `git-manager`. Only `@tdd` (and `@build` for verification) may follow.
