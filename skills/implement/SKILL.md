---
name: implement
description: Use when implementing project production code against a contract in two stages: skeleton first, then green, without touching tests.
---

# Implementation

You implement production code against the contract. Never edit tests or test helpers, and never change the contract.

Read `CODESTYLE.md`, `AGENTS.md`, the relevant files under `docs/`, the contract, and the tests before changing code.

## Inputs

- The contract from `.tmp/contracts/<slug>.md`.
- The list of files you may touch and the stage: `red` (stage 1) or `green` (stage 2).
- The tests already written by `test-generator`. They are frozen after the red stage.

## Process

### Stage 1 — skeleton

- Add or update API functions, types, and public exports required by the contract.
- Keep the skeleton minimal but real: no placeholders, no `// TODO`, no stubs in the final code.
- Run `pnpm exec eslint --cache --cache-location node_modules/.cache/eslint <changed files>` — targeted lint with the shared cache; the full `pnpm lint` is the orchestrator's gate, not yours.
- Run the focused tests — all affected paths in a single `pnpm exec vitest run` call, output with the filter built in (`2>&1 | tail -80` or `| grep -E '<failure markers>'`). They must fail on assertions, not on import errors. If they fail on imports, fix the skeleton before continuing. The type gate (`pnpm typecheck`) belongs to the orchestrator's red stage.

### Stage 2 — green

- Implement the behavior until the focused tests pass.
- Run the focused tests — one `pnpm exec vitest run` call over all the task's paths, with the output filter built in. The full `pnpm lint`, `pnpm typecheck`, and `pnpm build` are the orchestrator's gates (`@tdd`, or the calling `@build` session by its own matrix) — the coder never duplicates them.
- Do not adjust the tests to make the implementation pass.

When the coder is dispatched by an agent other than `tdd`, the gate commands are still run by the dispatcher under its own rules — the coder does not duplicate them either way.

## Deletions

Delete files only when the task explicitly lists them, and only with the `delete_file` tool:

- Shell `rm`, `git rm`, and writing an empty file instead of a deletion are forbidden.
- The deletion list comes from the plan through `@tdd`; `coder` never picks files itself. A file outside the list → `BLOCKED` and return the requirement to `@tdd`.
- Test files (`*.test.ts`, `*.test.tsx`, `*.testHelpers.ts`, `src/shared/testing/**`, `src/shared/api/testing/**`) may be deleted only when the task explicitly allows it — the tool asks the user to confirm every such deletion.
- After a deletion, clean up the imports and exports it orphans so the task stays green.

## Output

`DONE` or `BLOCKED` with a short summary of the changes, the exact commands run, and their results. Answer the user in Russian.

## BLOCKED

- The contract is missing, contradictory, or lacks a symbol that the tests require.
- The stage is not specified.
- A test must change to pass: return the requirement to `@tdd` instead of editing the test.
- The change would break FSD layer boundaries or another feature's public API.

## Out of scope

Tests, test helpers, `src/shared/testing/**`, configuration, docs, commits. Architecture rules live in the `architecture` skill and [CODESTYLE.md](../../../CODESTYLE.md); test rules live in `testing`.
