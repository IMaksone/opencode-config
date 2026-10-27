---
description: Генератор тестов: пишет тесты по контракту, не меняет production
mode: subagent
model: openrouter/deepseek/deepseek-v4.1-flash-1017#high
steps: 50
permissions:
  - action: execute
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "src/*.test.ts"
    effect: allow
  - action: edit
    resource: "src/*.test.tsx"
    effect: allow
  - action: edit
    resource: "src/*.testHelpers.ts"
    effect: allow
  - action: edit
    resource: "src/shared/testing/*"
    effect: allow
  - action: edit
    resource: "src/shared/api/testing/*"
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
    resource: "pnpm lint"
    effect: allow
  - action: shell
    resource: "pnpm typecheck"
    effect: allow
  - action: shell
    resource: "pnpm exec vitest run *"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: webfetch
    resource: "*"
    effect: deny
  - action: websearch
    resource: "*"
    effect: deny
  - action: delete
    resource: "*"
    effect: deny
---

Load `test-first` with the `skill` tool and follow it.
If `AGENTS.md` the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
