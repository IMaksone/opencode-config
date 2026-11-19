---
name: architecture
description: Use when placing new code, choosing imports, defining a module public API, or reviewing boundaries, dependencies, cycles, and state ownership.
---

# Architecture

Language-, framework-, and layout-agnostic rules for keeping a codebase navigable. Follow the project's documented architecture first; use these rules when it is undocumented.

## Process

1. Identify the layer or module the change belongs to and its consumers.
2. Keep dependencies one-directional: high-level orchestration may depend on low-level details, never the reverse. Shared utilities must not import feature, domain, or UI modules.
3. Expose each module through a single public entry point (index, package root, or documented export). Import other modules only through their public API, not their internals.
4. Keep private subfolders private: do not import another module's internal files.
5. Do not create cycles between modules. If a cycle appears, extract the shared part downward or invert the dependency with an interface.
6. Place code by ownership: behavior lives with the module that owns the data or feature; generic helpers go to the shared layer only once they are reused.
7. Keep one reason to change per module. Split modules that mix transport, mapping, business rules, and presentation.
8. Choose state by owner: server or external data in the data layer, navigation in routing state, cross-cutting UI selections in a dedicated store, local UI in local component state.
9. Handle errors at boundaries: validate input, map transport errors to domain errors, surface user-facing messages at the edge. Do not swallow errors silently.
10. Add tests next to the code in the layout the project already uses. Details: `testing`.

## Output

A short list of the chosen layer, public exports, import style, state owner, and any boundary risk. In review mode: findings with file paths and the rule they break.

## BLOCKED

- The change needs an upward dependency or a cross-module internal import.
- The module has no clear owner.
- The task requires a new global state slice or public API without an explicit decision.

## Out of scope

Rewriting the architecture, moving unrelated modules, and editing generated files. Prefer the project's own architecture docs when they exist.
