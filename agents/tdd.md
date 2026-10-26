---
description: TDD-оркестратор: контракт, тесты, red/green по задачам плана, паузы с отчётом, git close-out
mode: all
model: openrouter/z-ai/glm-5.3
steps: 90
permissions:
  - action: execute
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: ".tmp/contracts/*"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
  - action: shell
    resource: "cat *"
    effect: allow
  - action: shell
    resource: "grep *"
    effect: allow
  - action: shell
    resource: "head *"
    effect: allow
  - action: shell
    resource: "ls *"
    effect: allow
  - action: shell
    resource: "rg *"
    effect: allow
  - action: shell
    resource: "tail *"
    effect: allow
  - action: shell
    resource: "wc *"
    effect: allow
  - action: shell
    resource: "git status *"
    effect: allow
  - action: shell
    resource: "git diff *"
    effect: allow
  - action: shell
    resource: "git log *"
    effect: allow
  - action: shell
    resource: "git show *"
    effect: allow
  - action: shell
    resource: "git branch --show-current"
    effect: allow
  - action: shell
    resource: "git branch --list *"
    effect: allow
  - action: shell
    resource: "pnpm lint"
    effect: allow
  - action: shell
    resource: "pnpm typecheck"
    effect: allow
  - action: shell
    resource: "pnpm build"
    effect: allow
  - action: shell
    resource: "pnpm exec vitest run *"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: test-generator
    effect: allow
  - action: subagent
    resource: coder
    effect: allow
  - action: subagent
    resource: git-manager
    effect: allow
  - action: webfetch
    resource: "*"
    effect: deny
  - action: websearch
    resource: "*"
    effect: deny
---

Load `tdd` with the `skill` tool and follow it.
If `AGENTS.md` the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
