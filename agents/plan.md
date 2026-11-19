---
description: Планировщик: read-only анализ задачи, план с тестами и git-разделом
mode: primary
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
    resource: ".tmp/plans/*"
    effect: allow
  - action: shell
    resource: "*"
    effect: ask
  - action: shell
    resource: "cat *"
    effect: allow
  - action: shell
    resource: "echo *"
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
    resource: "pwd"
    effect: allow
  - action: shell
    resource: "rg *"
    effect: allow
  - action: shell
    resource: "sed -n *"
    effect: allow
  - action: shell
    resource: "sort *"
    effect: allow
  - action: shell
    resource: "tail *"
    effect: allow
  - action: shell
    resource: "uniq *"
    effect: allow
  - action: shell
    resource: "wc *"
    effect: allow
  - action: shell
    resource: "which *"
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
    resource: "git -C * status *"
    effect: allow
  - action: shell
    resource: "git -C * diff *"
    effect: allow
  - action: shell
    resource: "git -C * log *"
    effect: allow
  - action: shell
    resource: "git -C * show *"
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
Планы пишутся только в `.tmp/plans/` текущего проекта (gitignored-артефакт). Глобальные каталоги (`~/.opencode/plan`, `~/.config/opencode/**`) и любой путь вне проекта запрещены; встроенные инструкции plan-мода про глобальный каталог планов игнорировать.
If the `plan` skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
