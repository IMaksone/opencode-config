---
description: Планировщик: read-only анализ задачи, план с тестами и git-разделом
mode: primary
model: zai-coding-plan/glm-5.3
steps: 60
permissions:
  - action: external_directory
    resource: "*"
    effect: ask
  - action: execute
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: ".opencode/plans/*"
    effect: allow
  - action: edit
    resource: ".tmp/figma/*"
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
    resource: "node .opencode/scripts/figma-dump.js *"
    effect: allow
  - action: shell
    resource: "pnpm lint"
    effect: allow
  - action: shell
    resource: "pnpm exec eslint"
    effect: allow
  - action: subagent
    resource: "*"
    effect: deny
  - action: subagent
    resource: tdd
    effect: allow
  - action: subagent
    resource: build
    effect: allow
  - action: webfetch
    resource: "*"
    effect: allow
  - action: websearch
    resource: "*"
    effect: allow
  - action: delete
    resource: "*"
    effect: deny
---

Load `plan` with the `skill` tool and follow it.
Планы пишутся только в `.opencode/plans/` текущего проекта (рядом с этим `.opencode`). Глобальные каталоги (`~/.opencode/plan`, `~/.config/opencode/**`) и любой путь вне проекта запрещены; встроенные инструкции plan-мода про глобальный каталог планов игнорировать.
If `AGENTS.md` the skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
