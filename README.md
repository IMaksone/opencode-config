# opencode-config

Config for [opencode](https://opencode.ai). One repository, several variants in branches.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Universal skeleton: stack-agnostic agents and skills, no project rules. Start here to build a new variant. |
| `ts-react-modules-slices` | Full config for a TypeScript + React project with module slices (FSD). |

## What is here

- `opencode.json` — minimal config: default agent, compaction, `experimental` (v2 `subagent_depth`), global deny for `delete`/`session_move`/`browser_*`, Playwright browser MCP.
- `agents/` — stack-agnostic agents in the v2 permission syntax: `plan`, `build`, `tdd`, `coder`, `test-generator`, `git-manager`.
- `commands/` — `/plan` and `/tdd` shortcuts over the agents, model-agnostic.
- `skills/` — stack-agnostic skills: `plan`, `build`, `implement`, `test-first`, `testing`, `architecture`, `git-policy`, `tdd`.
- `plugins/` — thin entrypoints for six guards (ids are `kit.*`): `subagent-watchdog` (aborts hung subagent sessions), `agent-config-guard` (blocks dispatch from a stale config snapshot), `browser-guard` (navigation restricted to loopback origins), `delete-tool` (the sanctioned `delete_file` route), `session-move-guard` (session moves only to the project root or its worktrees), `foreground-only` (background tool runs normalized to foreground).
- `watchdog/`, `browser-guard/`, `delete-tool/`, `foreground/`, `session-move-guard/`, `scripts/agent-kit/` — guard implementations and their unit tests (`npx vitest run --config <dir>/vitest.config.ts`).
- `package.json`, `package-lock.json` — `@opencode/plugin` (v2) and `vitest` as a dev dependency.

Agents and skills here contain no stack or project assumptions: verification commands, test framework, layout, and branch conventions are discovered from the project or taken from the user. Everything stack- and project-specific (pinned tooling, Figma, module architecture, worktree kits) lives in variant branches — how to add it is described below.

## Install

```bash
git clone -b main <repo-url> ~/.config/opencode
```

A specific variant or a released state:

```bash
git clone -b ts-react-modules-slices <repo-url> ~/.config/opencode
git clone -b ts-react-modules-slices-v1.0.0 <repo-url> ~/.config/opencode
```

List variants and versions:

```bash
git ls-remote --heads --tags <repo-url>
git tag -l
```

Switching inside an existing clone: `git checkout <branch>` or `git checkout <tag>`. A tag leaves a detached HEAD, which is fine for a read-only config.

## Adapting the skeleton to a project

`main` works as-is on any stack: unknown commands go through `ask` prompts, and the skills discover lint/typecheck/build/test commands from the project's manifests. A variant branch usually pins them instead. Every topic below is a copy-paste starting point.

### 1. Verification commands

Out of the box `tdd` and `build` may run any command after a user confirmation (`shell "*": ask`). To make the gates prompt-free, add the project's commands to the agent frontmatter, after the read-only block:

```yaml
  # agents/build.md and agents/tdd.md
  - action: shell
    resource: "pnpm lint *"
    effect: allow
  - action: shell
    resource: "pnpm typecheck"
    effect: allow
  - action: shell
    resource: "pnpm exec vitest run *"
    effect: allow
```

The same shape works for `make *`, `npm run *`, `gradle *`, `go test *`, `cargo *` — mirror whatever the skills discover from the manifests. `coder` keeps its strict `shell "*": deny` whitelist; give it read-only extras only when the project needs them.

### 2. Test-file patterns

The coder/test-generator separation and the `delete_file` taxonomy rely on a polyglot default set: `*.test.*`, `*.spec.*`, `__tests__/`, `__snapshots__/`, `*.snap`, `*_test.go`, `*_test.py`/`test_*.py`, `conftest.py`, `*Test.java`/`*Tests.java`, `*_test.rs`. A project with a different layout (for example FSD test-support directories) extends three synchronized places:

- `agents/coder.md` — the `edit` denies and `delete` asks;
- `agents/test-generator.md` — the `edit` allows;
- `delete-tool/policy.ts` — `TEST_*` constants (the comment there says the same: keep the lists in sync), then re-run its tests.

### 3. Models

`main` pins no models: every agent inherits the account default, and `commands/` carry no `model:` overrides. To pin models in a variant:

- add `model: <provider>/<model>[#variant]` to an agent's frontmatter (`agents/*.md`);
- optionally add `model:` to `commands/*.md`;
- define custom `variants` (for example a low-temperature profile) under `providers` in `opencode.json`;
- set `OPENCODE_AGENT_GUARD_REQUIRE_MODEL=on` to make `agent-config-guard` block dispatch of agents without an explicit model (the kit's default is off).

### 4. Figma support

The `ts-react-modules-slices` branch carries the full Figma integration. To port it: copy `skills/figma/` and `skills/figma-design/`, `scripts/figma-dump.js`, add the `figma` MCP server to `opencode.json`, and grant the figma script to the `plan` agent (`shell` allow for `node .opencode/scripts/figma-dump.js *`) plus an `edit` allow for `.tmp/figma/*`. The reference implementation lives in that branch — diff `skills/figma*` and `scripts/` against it.

### 5. Worktree kit

`main` supports plain git worktrees: `git-manager` has `worktree.create/remove` modes and `session-move-guard` accepts any worktree of the project (requiring a `.opencode` kit link only when the project root itself carries one). The full linked-kit workflow of the variant branch — `<wt>/.opencode → <main>/.opencode` symlinks, `local.md` linking, the `worktree.kit` git-manager mode, session moves between the main folder and worktrees, WIP patches — is documented in `skills/git-policy/SKILL.md` and `skills/tdd/SKILL.md` of that branch. Port those sections together with the `session_move`/`external_directory` permissions of its agents.

### 6. Conventions

- **Plans and contracts** are gitignored artifacts under `.tmp/plans/` and `.tmp/contracts/` (already in `.gitignore`). A variant that wants tracked plans switches the `plan`/`tdd` skills and the `plan` agent's `edit` allow to `.opencode/plans/*`.
- **Initials and task numbers** are optional inputs taken only from the user (`local.md` in the project root feeds the initials; `instructions: ["local.md"]` in `opencode.json` loads it). A variant with a tracker-bound process makes them mandatory in the `plan`, `tdd`, and `git-policy` skills.
- **Protected branches** default to `main`, `master`, `develop`, `test`, `trunk`, `release`; declare the project's own set in `AGENTS.md` and, if needed, tighten the `git push` denies in `agents/git-manager.md`.
- **Commit language and format** follow the project's documented conventions; `git-policy` mirrors the recent `git log` style when nothing is documented. A variant may hard-pin Conventional Commits with English-only messages as the `ts-react-modules-slices` branch does.

## Extending

1. Create a branch from `main`: `git switch -c <variant>`.
2. Add what the variant needs: `agents/`, `commands/`, `skills/`, `plugins/`, scripts, MCP servers in `opencode.json`.
3. Keep the branch tip deployable: `git clone -b <variant>` must produce a working config.
4. Tag releases with the variant prefix: `git tag -a <variant>-v1.0.0 -m "<description>"`.
5. Push the branch and the tag.

Shared changes go to `main` first, then are carried into a variant with `git cherry-pick`.

## Versions

Tags are prefixed with the variant name, since tags are repository-wide: `base-v1.0.0`, `ts-react-modules-slices-v1.0.0`.
