---
name: testing
description: "Use when writing or reviewing tests: choosing the level, following the project framework, isolating cases, and running focused checks."
---

# Testing

Reference for writing and reviewing tests without assuming a language, framework, or layout.

## Inputs

- The module under change and its contract or plan.
- The level: pure unit test, integration or component behavior test, or contract test at a boundary.
- The project's test framework, configuration, and focused run command, discovered from its manifests and existing tests.

## Process

1. Detect the framework and conventions from existing tests before writing anything: file naming, placement, imports, assertion style, fixture and mock helpers. Match them.
2. Pick the level deliberately:
   - pure functions and transformations — unit tests, no I/O;
   - modules with side effects — mock the boundary, not the module under test;
   - UI or components — behavior through public interactions;
   - API or integration boundaries — request shape, response mapping, error paths.
3. Place the test where the project already keeps tests. Do not create a parallel test tree.
4. Build data with existing factories or fixtures. Do not re-implement production mapping in expected values.
5. Isolate: fresh state per test, reset mocks and timers, unsubscribe, clean up temporary files and servers.
6. Prefer deterministic assertions. No sleeps, no reliance on ordering without an explicit assertion, no network access unless the test harness provides it.
7. Test behavior and contracts, not private implementation details. One topic per test suite; names describe the expected behavior.
8. Run focused tests first, then the broader suite when the task requires it. Report the exact commands.

## What to test

- Pure utilities, transformations, parsers, and validators.
- Boundary behavior: validation, error mapping, retries, empty and edge inputs.
- Components with runtime logic: callbacks, disabled states, values, pending states.
- Contract points: method, path, query, body, status, and error shapes.

## What not to test

- Presentational markup without logic, barrel or re-export modules, type-only modules.
- Framework internals or third-party libraries.
- Private helpers through indirect tricks when a public behavior covers them.
- Snapshots unless the project already uses them deliberately.

## Output

`DONE` or `BLOCKED` with the test files, the exact commands run, and their results.

## BLOCKED

- The contract or public API lacks a selector, identifier, or shape the test needs.
- The test would require production changes to compile.
- The scenario is end-to-end only and the project has no e2e harness.
- No test framework can be detected and the project has no test setup.

## Out of scope

Production code, end-to-end tests, coverage thresholds, CI configuration, deployment. Layering rules: `architecture`.
