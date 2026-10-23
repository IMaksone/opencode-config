---
name: test-first
description: Use when writing project tests from a contract before implementation: behavior tests next to the source, Vitest, Testing Library and MSW.
---

# Test-first

You write tests only. Never modify production code, configuration, or documentation.

Read `CODESTYLE.md`, `AGENTS.md`, the relevant files under `docs/`, and the contract before writing tests.

## Inputs

- The contract from `.tmp/contracts/<slug>.md` with behavior, API/types, errors, UI/selectors, state/URL, fixtures/MSW, and test identifiers.
- The list of test files you may create or edit.

## Process

1. Map each contract behavior to one test case. Test names are English and describe behavior, not implementation.
2. Put tests next to the source file: `<module>.test.ts` or `<module>.test.tsx`.
3. Use Vitest, `happy-dom`, Testing Library, and MSW. Use `userEvent` for interactions.
4. Use fixtures from `src/shared/testing/testFixtures.ts`.
5. For API tests use the shared harness (`createApiTestHarness`, `captureJsonRequests`, `server.use`) as described in the `testing` skill.
6. Do not use layout snapshots.
7. Run `pnpm exec vitest run <new test paths>` and `pnpm lint`.

## Output

`DONE` or `BLOCKED` with the list of test files, the exact commands run, and their results. Answer the user in Russian.

## BLOCKED

- The contract is missing a symbol, identifier, or selector: return the requirement to `@tdd`, do not guess.
- A test would need production changes to compile.
- The contract contradicts the existing public API.

## Out of scope

Production code, the contract, configuration, docs, full `pnpm test` runs, commits. Full test rules: [docs/tests.md](../../../docs/tests.md); the condensed version is in the `testing` skill.
