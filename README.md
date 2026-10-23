# opencode-config

Config for [opencode](https://opencode.ai). One repository, several variants in branches.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Universal minimal skeleton: no stack, no project rules. Extend it for a new stack. |
| `ts-react-modules-slices` | Full config for a TypeScript + React project with module slices (FSD). |

## Stack of `ts-react-modules-slices`

- TypeScript, React, Feature-Sliced Design (layers, slices, public API through `index.ts`).
- RTK Query for server state, `sessionState` / `pageNavigationState` for UI state.
- pnpm, Vitest, happy-dom, Testing Library, MSW.
- Test-first workflow: plan → contract → tests → red/green implementation → review.
- Git policy with task branches, close-out and manual MR.
- OpenRouter models per agent.
- Figma: remote MCP server and a read-only REST dump via `scripts/figma-dump.js`.

Agents: `plan`, `build`, `tdd`, `coder`, `test-generator`, `git-manager`.
Commands: `/plan`, `/tdd`.
Skills: `architecture`, `build`, `figma`, `git-policy`, `implement`, `plan`, `tdd`, `test-first`, `testing`.

## Install

```bash
git clone -b ts-react-modules-slices <repo-url> ~/.config/opencode
```

Pick a released state instead of the branch head:

```bash
git checkout ts-react-modules-slices-v1.0.0
```

Create `local.md` in the project root with your two lowercase Latin initials — `plan`, `tdd` and `git-policy` read it.

## Versions

Tags are prefixed with the variant name: `ts-react-modules-slices-v1.0.0`.

```bash
git tag -l
git checkout <tag>
```

## Extending

Create a branch from `main`, add your `agents/`, `commands/`, `skills/`, `plugins/`, commit, and tag it with your own prefix. Keep branch tips deploying-ready: `git clone -b <branch>` must produce a working config.

Shared changes go to `main` first, then are carried into a variant with `git cherry-pick`.
