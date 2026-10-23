---
description: "Планировщик: read-only анализ задачи и план реализации без привязки к стеку"
mode: primary
temperature: 0.1
steps: 60
permission:
  edit:
    "*": deny
    ".tmp/plans/**": allow
  bash:
    "*": deny
    ls: allow
    "ls *": allow
    cat: allow
    "cat *": allow
    grep: allow
    "grep *": allow
    head: allow
    "head *": allow
    rg: allow
    "rg *": allow
    tail: allow
    "tail *": allow
    wc: allow
    "wc *": allow
    find: allow
    "find *": allow
    "git status": allow
    "git status *": allow
    "git diff": allow
    "git diff *": allow
    "git log": allow
    "git log *": allow
    "git show": allow
    "git show *": allow
    "git branch --show-current": allow
  task:
    "*": deny
    tdd: allow
    build: allow
  webfetch: allow
  websearch: allow
---

Load `plan` with the `skill` tool and follow it.
Answer the user in Russian.
