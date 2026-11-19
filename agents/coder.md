---
description: Разработчик: реализует production-код по контракту до green, тесты не трогает
mode: subagent
steps: 120
permissions:
  - action: execute
    resource: "*"
    effect: deny
  - action: edit
    resource: "*"
    effect: allow
  - action: edit
    resource: ".env*"
    effect: deny
  - action: edit
    resource: "*.env*"
    effect: deny
  - action: edit
    resource: "*.local"
    effect: deny
  - action: edit
    resource: ".git/*"
    effect: deny
  - action: edit
    resource: "*.test.*"
    effect: deny
  - action: edit
    resource: "*.spec.*"
    effect: deny
  - action: edit
    resource: "__tests__/*"
    effect: deny
  - action: edit
    resource: "__snapshots__/*"
    effect: deny
  - action: edit
    resource: "*.snap"
    effect: deny
  - action: edit
    resource: "*_test.go"
    effect: deny
  - action: edit
    resource: "*_test.py"
    effect: deny
  - action: edit
    resource: "test_*.py"
    effect: deny
  - action: edit
    resource: "conftest.py"
    effect: deny
  - action: edit
    resource: "*Test.java"
    effect: deny
  - action: edit
    resource: "*Tests.java"
    effect: deny
  - action: edit
    resource: "*_test.rs"
    effect: deny
  - action: delete
    resource: "*"
    effect: allow
  - action: delete
    resource: ".env*"
    effect: deny
  - action: delete
    resource: "*.env*"
    effect: deny
  - action: delete
    resource: "*.local"
    effect: deny
  - action: delete
    resource: ".git/*"
    effect: deny
  - action: delete
    resource: "*.test.*"
    effect: ask
  - action: delete
    resource: "*.spec.*"
    effect: ask
  - action: delete
    resource: "__tests__/*"
    effect: ask
  - action: delete
    resource: "__snapshots__/*"
    effect: ask
  - action: delete
    resource: "*.snap"
    effect: ask
  - action: delete
    resource: "*_test.go"
    effect: ask
  - action: delete
    resource: "*_test.py"
    effect: ask
  - action: delete
    resource: "test_*.py"
    effect: ask
  - action: delete
    resource: "conftest.py"
    effect: ask
  - action: delete
    resource: "*Test.java"
    effect: ask
  - action: delete
    resource: "*Tests.java"
    effect: ask
  - action: delete
    resource: "*_test.rs"
    effect: ask
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
  - action: webfetch
    resource: "*"
    effect: deny
  - action: websearch
    resource: "*"
    effect: deny
---

Load `implement` with the `skill` tool and follow it.
If the `implement` skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
