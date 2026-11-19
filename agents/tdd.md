---
description: TDD-оркестратор: контракт, тесты, red/green по задачам плана, паузы с отчётом, git close-out
mode: all
steps: 90
permissions:
  - action: execute
    resource: "*"
    effect: deny
  - action: session_move
    resource: "*"
    effect: allow
  - action: edit
    resource: "*"
    effect: deny
  - action: edit
    resource: ".tmp/contracts/*"
    effect: allow
  - action: edit
    resource: "*/.tmp/contracts/*"
    effect: allow
  - action: external_directory
    resource: "*/.tmp/*"
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
    resource: "git branch -a"
    effect: allow
  - action: shell
    resource: "git branch -vv"
    effect: allow
  - action: shell
    resource: "git rev-parse *"
    effect: allow
  - action: shell
    resource: "git remote -v"
    effect: allow
  - action: shell
    resource: "git ls-files *"
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
    resource: test-generator
    effect: allow
  - action: subagent
    resource: coder
    effect: allow
  - action: subagent
    resource: git-manager
    effect: allow
  - action: subagent
    resource: build
    effect: allow
  - action: webfetch
    resource: "*"
    effect: deny
  - action: websearch
    resource: "*"
    effect: deny
  - action: delete
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

Load `tdd` with the `skill` tool and follow it.
If the `tdd` skill is missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
