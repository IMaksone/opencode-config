---
name: architecture
description: Use when placing project code in the FSD layers, choosing imports, exposing a module public API, or checking component and state conventions.
---

# Project architecture

Reference skill for Feature-Sliced Design and the project code conventions. Load it when you create a module, move code between layers, or review imports and state.

## Inputs

- The module or file you are about to create or change.
- The layer it belongs to and its consumers.

## Process

1. Pick the layer: `app` → `pages` → `widgets` → `features` → `entities` → `shared`. Dependencies point only downward.
2. Expose the module only through its `index.ts`. Import other modules from their public API.
3. Inside `entities` and `features`, use relative imports for the same layer/domain; do not use `@/entities` or `@/features` there.
4. Keep `_ui/` private to its module; do not import another module's `_ui/`.
5. Features must not call the API of other features; they read through `entities` and `shared`.
6. Make `ComponentWrapper` with `componentId` the root element of a component.
7. Choose state by owner: RTK Query for server data, `pageNavigationState.use*()` for navigation, `sessionState.use*()` for stable UI selections, local `useState` for local UI.
8. Handle errors after `.unwrap()` with `parseApiError` → `showToast.error` → `throwException`.

Layer permissions:

| Layer      | May import from                                      |
| ---------- | ---------------------------------------------------- |
| `app`      | `pages`, `features`, `widgets`, `shared`, `entities` |
| `pages`    | `entities`, `features`, `widgets`, `shared`          |
| `widgets`  | `shared`, `entities`, `features`                     |
| `features` | `entities`, `shared`                                 |
| `entities` | `shared`                                             |
| `shared`   | only inside `shared`                                 |

Entities read and map data through thin hooks plus `helper/<topic>.ts`; features own writes and mutations. The public namespace of `src/entities` is `entities`.

## Output

A short list of the chosen layer, public exports, import style, state owner, and any boundary risk. In code review mode: findings with file paths and the rule they break.

## BLOCKED

- The change needs an upward dependency or a cross-feature API call.
- The module has no clear layer.
- The task requires a new global state slice without an explicit decision.

## Out of scope

Rewriting the architecture, moving unrelated modules, and editing generated files. Full reference: [CODESTYLE.md](../../../CODESTYLE.md), [docs/file_structure.md](../../../docs/file_structure.md), [docs/entities.md](../../../docs/entities.md), [docs/features.md](../../../docs/features.md), [docs/api.md](../../../docs/api.md), [docs/state.md](../../../docs/state.md).
