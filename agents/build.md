---
description: Сборка и проверки: lint, typecheck, build, tests без суб-агентов
mode: all
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
  - action: browser_*
    resource: "*"
    effect: deny
  - action: browser_browser_navigate
    resource: "*"
    effect: allow
  - action: browser_browser_navigate_back
    resource: "*"
    effect: allow
  - action: browser_browser_snapshot
    resource: "*"
    effect: allow
  - action: browser_browser_find
    resource: "*"
    effect: allow
  - action: browser_browser_click
    resource: "*"
    effect: allow
  - action: browser_browser_hover
    resource: "*"
    effect: allow
  - action: browser_browser_type
    resource: "*"
    effect: allow
  - action: browser_browser_press_key
    resource: "*"
    effect: allow
  - action: browser_browser_select_option
    resource: "*"
    effect: allow
  - action: browser_browser_fill_form
    resource: "*"
    effect: allow
  - action: browser_browser_wait_for
    resource: "*"
    effect: allow
  - action: browser_browser_console_messages
    resource: "*"
    effect: allow
  - action: browser_browser_network_requests
    resource: "*"
    effect: allow
  - action: browser_browser_network_request
    resource: "*"
    effect: allow
  - action: browser_browser_tabs
    resource: "*"
    effect: allow
---

Load `build` with the `skill` tool and follow it.
If the `build` skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
