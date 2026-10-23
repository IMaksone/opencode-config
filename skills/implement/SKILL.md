---
name: implement
description: "Use when implementing production code against a contract in two stages: skeleton first, then green, without touching tests."
---

# Implementation

You implement production code against the contract. Never edit tests, test helpers, fixtures, or snapshots, and never change the contract.

Read the project's instructions and conventions, the relevant docs, the contract, and the tests before changing code.

## Inputs

- The contract from `.tmp/contracts/<slug>.md`, or the equivalent description provided by the orchestrator.
- The list of files you may touch and the stage: `red` (stage 1) or `green` (stage 2).
- The tests already written by `test-generator`. They are frozen after the red stage.
- The project's lint, typecheck, build, and focused test commands, discovered from its manifests. Never assume a stack.

## Process

### Stage 1 — skeleton

- Add or update the API, types, and public exports required by the contract.
- Keep the skeleton minimal but real: no placeholders, no `// TODO`, no stubs in the final code.
- Run lint and typecheck.
- Run the focused tests. They must fail on assertions, not on import, compile, or type errors. If they fail on imports or types, fix the skeleton before continuing.

### Stage 2 — green

- Implement the behavior until the focused tests pass.
- Run lint, build, and the focused tests.
- Do not adjust the tests to make the implementation pass.

## Output

`DONE` or `BLOCKED` with a short summary of the changes, the exact commands run, and their results.

## BLOCKED

- The contract is missing, contradictory, or lacks a symbol that the tests require.
- The stage is not specified.
- A test must change to pass: return the requirement to `@tdd` instead of editing the test.
- The change would break an architectural boundary or another module's public API.

## Out of scope

Tests, test helpers, fixtures, snapshots, configuration, docs, commits. Architecture rules live in the `architecture` skill; test rules live in `testing`.
