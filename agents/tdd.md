---
description: "TDD-оркестратор: контракт, тесты, red/green, git-подготовка и close-out"
mode: all
temperature: 0.1
steps: 90
permission:
  edit:
    "*": deny
    ".tmp/contracts/**": allow
  bash:
    "*": ask
    cat: allow
    "cat *": allow
    grep: allow
    "grep *": allow
    head: allow
    "head *": allow
    ls: allow
    "ls *": allow
    rg: allow
    "rg *": allow
    tail: allow
    "tail *": allow
    wc: allow
    "wc *": allow
    "git status": allow
    "git status *": allow
    "git diff": allow
    "git diff *": allow
    "git log": allow
    "git log *": allow
    "git show": allow
    "git show *": allow
    "git branch --show-current": allow
    "git branch --list": allow
  task:
    "*": deny
    test-generator: allow
    coder: allow
    git-manager: allow
  webfetch: deny
  websearch: deny
---

Load `tdd` with the `skill` tool and follow it.
If the task, contract inputs or verification commands are missing, return `BLOCKED` and list what is missing.
Answer the user in Russian.
