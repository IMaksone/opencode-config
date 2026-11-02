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
- Git policy with task branches, per-task commits after user confirmation, close-out and manual MR.
- Agent worktree workflow: a shared worktree at `../cervart-wt/agent`, branch from `origin/<base>`, WIP sync patches on the user's command.
- OpenRouter models per agent.
- Figma: remote MCP server and a read-only REST dump via `scripts/figma-dump.js`.

Agents: `plan`, `build`, `tdd`, `coder`, `test-generator`, `git-manager`.
Commands: `/plan`, `/tdd`.
Skills: `architecture`, `build`, `figma`, `git-policy`, `implement`, `plan`, `tdd`, `test-first`, `testing`.

## OpenCode V2

The config targets `opencode 2.1.4` and the native V2 shapes: `permissions` arrays, `shell`/`subagent` actions, `mcp.servers`, and model variants.

- Plugins are `plugins/subagent-watchdog.ts` (`cervart.subagent-watchdog`), `plugins/agent-config-guard.ts` (`cervart.agent-config-guard`), `plugins/foreground-only.ts` (`cervart.foreground-only`), `plugins/delete-tool.ts` (`cervart.delete-tool`), `plugins/browser-guard.ts` (`cervart.browser-guard`), and `plugins/session-move-guard.ts` (`cervart.session-move-guard`). All default-export `Plugin.define({ id, setup })` and need the V2 package:

  ```bash
  cd .opencode && npm i   # @opencode/plugin@2.1.4
  ```

- `agent-config-guard` provides the `agent_config_check` tool. Its snapshot is bound to the running **process**, not to the plugin load, because V2 reloads plugins on every save — so **any edit under `.opencode/` requires `opencode service restart` before the next subagent dispatch**.
- `subagent-watchdog` aborts child sessions that stay `busy`/`retry` without activity for 10 minutes. `OPENCODE_SUBAGENT_WATCHDOG=off` disables it; `OPENCODE_SUBAGENT_WATCHDOG_TIMEOUT_MS` overrides the timeout.
- `foreground-only` (`plugins/foreground-only.ts`, `cervart.foreground-only`) normalizes every `background: true` request on `shell`/`subagent` (and the V1 `bash`/`task`) back to foreground before execution and strips the `background` parameter from their tool schemas: background completion notifications do not reliably resume the caller session. Logs carry `service=foreground-only`: `foreground-only started`, `forced foreground`, `hook failed`. `OPENCODE_FOREGROUND_ONLY=off` disables it. Long runs now block the calling session, so give them an explicit `timeout` in ms (`0` means no timeout). Any edit under `.opencode/` needs `opencode service restart` before the plugin is active.
- `delete-tool` (`plugins/delete-tool.ts`, `cervart.delete-tool`) registers the `delete_file` tool — the only sanctioned file deletion. It accepts 1–50 paths (absolute or project-relative), refuses anything that is not an existing `.ts`/`.tsx` file under `src/` (all-or-nothing: one invalid path cancels the whole request), then runs one `permission.assert` with the dedicated `delete` action and `save: []` — the permission is never remembered, so a test file asks again on every deletion. `agents/coder.md` allows `src/*.ts`/`src/*.tsx` and routes test files (`*.test.ts`, `*.test.tsx`, `*.testHelpers.ts`, `src/shared/testing/*`, `src/shared/api/testing/*`) through `ask`; the global `permissions` rule in `opencode.json` denies `delete` for every other agent. Deletion decisions belong to `plan` (the plan lists exact paths) and `tdd` (the coder prompt carries the list) — `coder` never picks files itself, and its shell rules have no `rm`. Logs carry `service=delete-tool`: `delete-tool started`, `delete refused`, `delete denied`, `delete executed`.
- `browser-guard` (`plugins/browser-guard.ts`, `cervart.browser-guard`) pins live browser checks to the dev server: `browser_browser_navigate` (and `browser_browser_tabs` with `action: "new"` + `url`) may open only `http://localhost:3000` / `http://127.0.0.1:3000` (mirrors `vite.config.ts`, `strictPort`) plus `about:blank`; any other URL (the Vite defaults `5173`/`4173` agents used to guess) is refused by a `tool.execute.before` throw, and the model sees the reason naming the dev-server URL. No permission rule can do this: MCP tool resources are always `*`. Inspection tools (snapshot, find, click, console, network) pass through untouched. `OPENCODE_BROWSER_GUARD=off` disables it. Logs carry `service=browser-guard`: `browser-guard started`, `browser-guard disabled by environment`, `navigation refused`.
- `session-move-guard` (`plugins/session-move-guard.ts`, `cervart.session-move-guard`) registers the `session_move` tool — the only way to move the session working directory. It takes one absolute `directory` and validates the target before anything else: the canonical project root (`project-root`, the way back to the main folder) or a git worktree of the project (`worktree`) — proven by the linked-worktree marker `<wt>/.git` → `gitdir: <root>/.git/worktrees/<name>` (with one plain segment after `worktrees/`, no traversal) or by the native worktree inventory; every other directory is refused with the allowed list. The dedicated `session_move` action is checked with `permission.assert` and `save: []` before any target details, so a denied agent never sees the list: the global rule in `opencode.json` denies `session_move` for every agent, `agents/tdd.md` allows it, and no prompt can appear (config rules decide, nothing is remembered). The move itself is `ctx.session.move` — the confirmation is the tool message in chat plus the server log. `OPENCODE_SESSION_MOVE_GUARD=off` disables it. Logs carry `service=session-move-guard`: `session-move-guard started`, `session-move-guard disabled by environment`, `move denied`, `move refused`, `move executed`, `move failed`.
- Module tests: `npx vitest run --config foreground/vitest.config.ts`, `npx vitest run --config watchdog/vitest.config.ts`, `npx vitest run --config delete-tool/vitest.config.ts`, `npx vitest run --config browser-guard/vitest.config.ts`, and `npx vitest run --config session-move-guard/vitest.config.ts` (run from `.opencode/`; `vitest` resolves from the parent project's `node_modules`).
- `experimental.subagent_depth: 2` is required: `tdd` is a subagent that launches `test-generator` and `coder`.
- Sampling lives in model variants, not in the agent frontmatter. `providers.openrouter.models.*.variants` defines `#temp-low` (temperature `0.1`, reasoning off) plus `#low`/`#high` for DeepSeek, and agents select one with `model: provider/model#variant`.
- `execute` (Code Mode) is denied for every agent; tools are reached directly.
- The read-only `plan` profile may run the Figma export: it carries `shell: node .opencode/scripts/figma-dump.js *` together with `edit: .tmp/figma/*`, so the dump can write its gitignored artifacts without opening source, docs, or config. `build`, `tdd`, and `coder` have no `node` rule yet — add one per agent if they must re-run the dump after a design change.

`foreground-only` smoke check, after `opencode service restart`:

1. The server log has exactly one `foreground-only started` line (info, extra `{enabled: true, tools}`).
2. A `shell` call with `background: true` runs in foreground: the result arrives only on completion and the log has a `forced foreground` line with `{sessionID, tool}`.
3. The `shell` and `subagent` schemas the model sees carry no `background` parameter.
4. `agent_config_check` reports `fresh: true`.

`delete-tool` smoke check, after `opencode service restart` (scratch files are created and removed by hand):

1. In a `coder` session, `delete_file` on a scratch `src/_deleteSmoke.ts` deletes it without a prompt.
2. On a scratch `src/_deleteSmoke.test.ts` an ask-prompt appears: Allow once → deleted, and the next test deletion asks again (`save: []`); Reject → the file stays.
3. `docs/_deleteSmoke.md` and a directory path are refused with a reason list, nothing is deleted.
4. In a non-coder session (`plan`) the same call is denied by permissions.
5. `agent_config_check` reports `fresh: true`, and scratch files are gone.

`browser-guard` smoke check, after `opencode service restart`:

1. The server log has exactly one `browser-guard started` line (info, `service=browser-guard`).
2. With the dev server up, `browser_browser_navigate` to `http://localhost:3000` runs normally.
3. `browser_browser_navigate` to `http://localhost:5173` is refused with a `browser-guard:` reason naming `http://localhost:3000`, and the log has a `navigation refused` line.
4. Snapshot, click, and console tools are untouched.
5. `agent_config_check` reports `fresh: true`.

`session-move-guard` smoke check, after `opencode service restart`:

1. The server log has exactly one `session-move-guard started` line (info, `service=session-move-guard`).
2. In a `tdd` session, `session_move` with the worktree directory moves the session: the tool replies `session moved to <path> (worktree)` and the log has a `move executed` line (this also confirms the actual `session.move` input shape).
3. `session_move` with a foreign directory (not the project root, not its worktree) is refused with the allowed-target list, and the log has a `move refused` line.
4. In a non-tdd session (`build`) the same call is denied by permissions (`session_move` is denied globally), and the log has a `move denied` line without the allowed list.
5. `session_move` with `directory: <main>` moves the session back; `execute` (Code Mode) still fails for `tdd` (deny).
6. `agent_config_check` reports `fresh: true`.

## Agent worktree workflow

Task work runs in a shared git worktree; the main folder is never switched or pulled.

1. On the user's request («создай общий worktree [от <base>]») `git-manager` runs `worktree.create <branch> <base>`: `git worktree add <main>/../cervart-wt/agent -b <branch> origin/<base>`, then links the agent kit — `<wt>/.opencode → <main>/.opencode` and `<wt>/local.md → <main>/local.md` (the worktree gets all agents, skills, commands, plugins, and the shared `.opencode/plans`; the kit's `node_modules` is shared — no separate `npm i` in the kit) — plus the dependency setup (`.npmrc`, `corepack`, `pnpm install`, `gen-env`). An existing worktree is kitted by the user's command «подготовь кит в worktree [имя]» (`worktree.kit`); after any linking — `opencode service restart` (the config-guard snapshot is bound to the process).
2. `tdd` moves the session with the `session_move` tool (`directory: <абс-путь воркри>`; the target is validated by `session-move-guard`, the move is reported in chat, no prompt and no Code Mode) and dispatches `branch.create <branch>` with the start point `origin/<base>`.
3. Tasks and per-task commits run in the worktree; the commits land on the branch in the main repository immediately (shared `.git`) — no commit transport is needed.
4. WIP sync — only on the user's command: «синхронизируй WIP» applies the task's full diff from `origin/<base>` in the main folder as uncommitted changes (`wip.sync`), «убери WIP-синк» reverts it (`wip.unsync`). The applied state is probed with `git apply --check -R`; patch files accumulate in `<main>/.tmp/wip-sync/`.
5. Close-out (`закрыть <task-number>`) runs in the worktree, then the session moves back to the main folder; a still-applied WIP patch is reported. The worktree stays until the user asks to remove it («удали worktree»).

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
