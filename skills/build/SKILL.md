---
name: build
description: "Use when building and verifying a change: lint, typecheck, production build and tests, using the commands defined by the project, without sub-agents."
---

# Build and verification

You work autonomously and do not dispatch sub-agents. Make focused code changes when the task requires them, then verify the result. Never commit, push, switch branches, merge, or change git state.

Read the project's instructions and conventions first, if present: `AGENTS.md`, `CONTRIBUTING.md`, and the project style guide if present, and docs under `docs/`.

## Inputs

- The task or plan, with the files that are expected to change.
- The verification scope: focused paths for a small change, the whole project for a cross-cutting one.

## Discover the commands

Never assume a stack. Read the project manifests and CI configuration and take the commands from there:

- `package.json` scripts, lockfiles, workspace config;
- `Makefile`, `justfile`, `Taskfile.yml`, `composer.json`, `Gemfile`, `mix.exs`;
- `pyproject.toml`, `pytest.ini`, `tox.ini`, `Cargo.toml`, `go.mod`;
- `pom.xml`, `build.gradle`, `build.gradle.kts`, `*.sln`, `*.csproj`;
- `.github/workflows/*`, `.gitlab-ci.yml`, `Jenkinsfile`.

Map what you find to four slots: **lint**, **typecheck**, **build**, **test**. If a slot is absent, record it as absent instead of inventing a command. If nothing can be discovered, stop and ask the user.

## Process

1. Read the task, the plan, and the affected modules before editing.
2. Follow the project's architecture and conventions; when they are undocumented, prefer the patterns already used by neighbouring code. Details: `architecture`.
3. Do not leave placeholders or stubs such as `// TODO`.
4. Never edit `.env*`, `*.local`, secret files, or anything under `.git/`.
5. Do not start long-running dev servers.
6. Run the verification matrix below.
7. If the task asks for a plan, write it to `.tmp/plans/<task-slug>.md`, the shared plans folder.

## Verification matrix

| Change | Commands, in order |
| --- | --- |
| Source code | focused tests for changed paths → lint → typecheck → build → full test |
| Docs, skills, agent config only | lint → typecheck → full test |
| Shared/API modules | focused tests for the module → lint → build → full test |
| Build configuration, CI | build → full test |
| Nothing changed in source | lint → typecheck → full test |

Rules:

- A command counts as passed only with exit code 0. Report the exact commands and their results.
- Focused test runs never replace the full suite before the final report.
- If a check fails, fix the cause and rerun the whole row of the matrix.
- When a slot is absent in the project, note it as skipped; do not substitute a different check silently.

## Output

`DONE` or `BLOCKED` with a short summary of the changes, the exact commands run, and their results.

## BLOCKED

- A verification command fails and the cause is outside the allowed edit scope.
- The task requires editing env, secret, or local-only files.
- A long-running dev server is required to proceed.
- The repository state contradicts the plan (for example, unrelated dirty files).

## Out of scope

Sub-agents, commits, pushes, branch switches, merges, MR creation, deploys, and dev servers. Architecture rules: `architecture`; test rules: `testing`.
