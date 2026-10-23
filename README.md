# opencode-config

Config for [opencode](https://opencode.ai). One repository, several variants in branches.

## Branches

| Branch | Purpose |
| --- | --- |
| `main` | Universal skeleton: stack-agnostic agents and skills, no project rules. Start here to build a new variant. |
| `ts-react-modules-slices` | Full config for a TypeScript + React project with module slices (FSD). |

## What is here

- `opencode.json` — minimal config: schema and `subagent_depth`.
- `agents/` — stack-agnostic agents: `plan`, `build`, `tdd`, `coder`, `test-generator`, `git-manager`.
- `skills/` — stack-agnostic skills: `plan`, `build`, `implement`, `test-first`, `testing`, `architecture`, `git-policy`, `tdd`.
- `plugins/subagent-watchdog.ts` — aborts subagent sessions that stay busy without activity.
- `watchdog/` — watchdog state and tests.
- `package.json`, `package-lock.json` — dependency of the plugin.

Agents and skills here contain no stack or project assumptions: verification commands, test framework, layout, and branch conventions are discovered from the project or taken from the user. Everything stack- and project-specific (commands, Figma, module architecture, fixed tooling) lives in variant branches.

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

## Extending

1. Create a branch from `main`: `git switch -c <variant>`.
2. Add what the variant needs: `agents/`, `commands/`, `skills/`, `plugins/`, scripts, MCP servers in `opencode.json`.
3. Keep the branch tip deployable: `git clone -b <variant>` must produce a working config.
4. Tag releases with the variant prefix: `git tag -a <variant>-v1.0.0 -m "<description>"`.
5. Push the branch and the tag.

Shared changes go to `main` first, then are carried into a variant with `git cherry-pick`.

## Versions

Tags are prefixed with the variant name, since tags are repository-wide: `base-v1.0.0`, `ts-react-modules-slices-v1.0.0`.
