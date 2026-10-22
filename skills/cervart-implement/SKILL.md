---
name: cervart-implement
description: Use when implementing Cervart production code against a contract in two stages: skeleton first, then green, without touching tests.
---

# Cervart implementation

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
- Run `pnpm lint` and `pnpm typecheck`.
- Run the focused tests. They must fail on assertions, not on import or type errors. If they fail on imports/types, fix the skeleton before continuing.

### Stage 2 — green

- Implement the behavior until the focused tests pass.
- Run `pnpm lint`, `pnpm build`, and the focused tests.
- Do not adjust the tests to make the implementation pass.

## Output

`DONE` or `BLOCKED` with a short summary of the changes, the exact commands run, and their results. Answer the user in Russian.

## BLOCKED

- The contract is missing, contradictory, or lacks a symbol that the tests require.
- The stage is not specified.
- A test must change to pass: return the requirement to `@tdd` instead of editing the test.
- The change would break FSD layer boundaries or another feature's public API.

## Out of scope

Tests, test helpers, `src/shared/testing/**`, configuration, docs, commits. Architecture rules live in the `cervart-architecture` skill and [CODESTYLE.md](../../../CODESTYLE.md); test rules live in `cervart-testing`.
