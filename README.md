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

## OpenCode V2

The config targets `opencode 2.1.4` and the native V2 shapes: `permissions` arrays, `shell`/`subagent` actions, `mcp.servers`, and model variants.

- Plugins are `plugins/subagent-watchdog.ts` (`cervart.subagent-watchdog`) and `plugins/agent-config-guard.ts` (`cervart.agent-config-guard`). Both default-export `Plugin.define({ id, setup })` and need the V2 package:

  ```bash
  cd .opencode && npm i   # @opencode/plugin@2.1.4
  ```

- `agent-config-guard` provides the `agent_config_check` tool. Its snapshot is bound to the running **process**, not to the plugin load, because V2 reloads plugins on every save — so **any edit under `.opencode/` requires `opencode service restart` before the next subagent dispatch**.
- `subagent-watchdog` aborts child sessions that stay `busy`/`retry` without activity for 10 minutes. `OPENCODE_SUBAGENT_WATCHDOG=off` disables it; `OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS` overrides the timeout.
- `experimental.subagent_depth: 2` is required: `tdd` is a subagent that launches `test-generator` and `coder`.
- Sampling lives in model variants, not in the agent frontmatter. `providers.openrouter.models.*.variants` defines `#temp-low` (temperature `0.1`, reasoning off) plus `#low`/`#high` for DeepSeek, and agents select one with `model: provider/model#variant`.
- `execute` (Code Mode) is denied for every agent; tools are reached directly.

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
