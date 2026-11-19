---
description: Генератор тестов: пишет тесты по контракту, не меняет production
mode: subagent
steps: 50
permissions:
  - action: execute
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: "*.test.*"
    effect: allow
  - action: edit
    resource: "*.spec.*"
    effect: allow
  - action: edit
    resource: "__tests__/*"
    effect: allow
  - action: edit
    resource: "__snapshots__/*"
    effect: allow
  - action: edit
    resource: "*.snap"
    effect: allow
  - action: edit
    resource: "*_test.go"
    effect: allow
  - action: edit
    resource: "*_test.py"
    effect: allow
  - action: edit
    resource: "test_*.py"
    effect: allow
  - action: edit
    resource: "conftest.py"
    effect: allow
  - action: edit
    resource: "*Test.java"
    effect: allow
  - action: edit
    resource: "*Tests.java"
    effect: allow
  - action: edit
    resource: "*_test.rs"
    effect: allow
  - action: shell
    resource: "*"
    effect: deny
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
If the `test-first` skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
