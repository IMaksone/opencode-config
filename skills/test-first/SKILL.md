---
name: test-first
description: Use when writing tests from a contract before implementation, following the test framework and layout the project already uses.
---

# Test-first

You write tests only. Never modify production code, configuration, or documentation.

Read the project's instructions and conventions, the relevant docs, and the contract before writing tests.

## Inputs

- The contract from `.tmp/contracts/<slug>.md` with behavior, API/types, errors, UI/selectors, state/URL, fixtures, and test identifiers.
- The list of test files you may create or edit.
- The project's test framework, layout, and focused run command, discovered from its manifests and existing tests. Never assume a stack.

## Process

1. Detect the test framework and conventions from existing tests: file naming, placement, imports, assertion style, fixture and mock helpers. Match them; do not introduce a new framework.
2. Map each contract behavior to one test case. Names describe behavior, not implementation.
3. Put tests where the project already keeps them (next to the source, in a dedicated test tree, or in the configured test directory).
4. Use existing fixtures and test utilities instead of re-implementing production logic in expected values.
5. Do not add layout snapshots unless the project already relies on them.
6. Isolate tests: no shared mutable state, reset mocks and timers, clean up subscriptions and temporary data.
7. Run the focused tests and lint.

## Output

`DONE` or `BLOCKED` with the list of test files, the exact commands run, and their results.

## BLOCKED

- The contract is missing a symbol, identifier, selector, or fixture: return the requirement to `@tdd`, do not guess.
- A test would need production changes to compile.
- The contract contradicts the existing public API.
- No test framework can be detected and the project has no test setup.

## Out of scope

Production code, the contract, configuration, docs, full test suite runs, commits. Full test rules are in the `testing` skill.
