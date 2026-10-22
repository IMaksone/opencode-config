---
name: cervart-testing
description: Use when writing or reviewing Cervart unit tests: Vitest location and style, MSW API harness, fixtures, and focused run commands.
---

# Cervart testing

Condensed reference for unit tests. Full rules and per-module coverage notes: [docs/tests.md](../../../docs/tests.md).

## Inputs

- The module under change and its contract or plan.
- The level: helper unit test, component behavior test, or API contract test.

## Process

1. Pick the level:
   - `src/entities/**/helper/` — pure function tests, no React.
   - `src/shared/**` — utilities, hook logic, components with runtime behavior.
   - `src/shared/api/**` — endpoint contract, `transformResponse`, errors, tag invalidation.
2. Place the test next to the source: `<module>.test.ts` or `<module>.test.tsx`. Test name = file name of the module under test.
3. Use Vitest with `happy-dom`; the global setup is `src/shared/testing/setup.ts`. Do not add a local setup file.
4. Use `@testing-library/react` (`render`, `screen`, `renderHook`, `act`), `@testing-library/user-event` (`userEvent.setup()`), and jest-dom matchers. Interactions go through `userEvent`, not `fireEvent`.
5. Build data with factories from `src/shared/testing/testFixtures.ts`; do not re-implement production mapping in expected values.
6. For API tests use the shared harness: `createApiTestHarness` creates an isolated API and store, `captureJsonRequests` asserts method/pathname/query/body, `server.use` adds special handlers, and unhandled requests fail the test (`onUnhandledRequest: 'error'`). Use realistic fixtures and assert `transformResponse` results.
7. Isolate: reset mocks and timers in `afterEach` (`vi.restoreAllMocks()`, `vi.useRealTimers()`, `vi.unstubAllGlobals()`), `unsubscribe` manual subscriptions, never reuse a store between tests. The API setup already resets MSW handlers and RTK Query state.
8. Test behavior, not implementation. One `describe` per module; English case names (`filters wells by selected codes as strings`). No layout snapshots.
9. Run focused tests, then the suite:

```bash
pnpm exec vitest run <paths>
pnpm exec vitest run src/entities
pnpm test
```

## What to test

- Pure utilities and helpers, including `src/entities/**/helper/**`.
- Data, date, path, and color transformations, and side-effect utilities through DOM/API mocks.
- Components with runtime logic: callbacks, disabled states, values, pending states.
- API: exact method, pathname (with `toBe`/`toEqual`, not `toContain`), query, body or `FormData`, error paths, cache invalidation observed through refetch.

## What not to test

- Presentational markup without logic, barrel `index.ts`, thin skip-only entity hooks, `useExport*` wrappers, type-only modules, and snapshots.
- RTK Query, MSW, or React inside `entities` helper tests.
- Internal RTK Query configuration when a refetch proves the same behavior.

## Output

`DONE` or `BLOCKED` with the test files, the exact commands run, and their results. Answer the user in Russian.

## BLOCKED

- The contract or public API lacks a selector, identifier, or shape the test needs.
- The test would require production changes to compile.
- The scenario is e2e-only.

## Out of scope

Production code, e2e tests, coverage thresholds, CI configuration. Entity hook structure: [docs/entities.md](../../../docs/entities.md); layering: `cervart-architecture`.
